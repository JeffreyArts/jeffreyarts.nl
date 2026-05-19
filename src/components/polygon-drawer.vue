<template>
    <div class="polygon-drawer">
        <div class="toolbar" :class="{ hidden: isInactive }">
            <button class="tool-btn" :class="{ active: mode === 'draw' }" @click="setMode('draw')" title="Teken (D)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <polygon points="9,2 16,13 2,13" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <circle cx="9" cy="2" r="1.5" fill="currentColor"/>
                    <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
                    <circle cx="2" cy="13" r="1.5" fill="currentColor"/>
                </svg>
                <span>Teken</span>
            </button>
            
            <button class="tool-btn" :class="{ active: mode === 'edit' }" @click="setMode('edit')" title="Bewerk (E)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 13L13 3L15 5L5 15L3 16L3 13Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
                <span>Bewerk</span>
            </button>
            
            <!-- Toggle MatterJS button -->
            <button class="tool-btn" :class="{ active: showMatterJS }" @click="toggleMatterJSView" title="Toggle MatterJS">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="2" width="14" height="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
                <span>Toggle MatterJS</span>
            </button>

            <div class="separator"/>

            
            <button class="tool-btn reset-btn" @click="resetAll" title="Reset (R)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9a6 6 0 1 0 1.5-3.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <polyline points="3,4 3,9 8,9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Reset</span>
            </button>
            

            <div class="polygon-count" v-if="polygons.length > 0">
                {{ polygons.length }} {{ polygons.length === 1 ? 'polygoon' : 'polygonen' }}
            </div>
        </div>
        
        <div class="hint" :class="{ hidden: isInactive }">
            <template v-if="mode === 'draw'">
                <span v-if="currentPoints.length === 0">Klik om een polygoon te beginnen</span>
                <span v-else-if="currentPoints.length < 3">{{ currentPoints.length }} punt{{ currentPoints.length > 1 ? 'en' : '' }} — nog {{ 3 - currentPoints.length }} nodig</span>
                <span v-else>Klik op het eerste punt om te sluiten · <kbd>Enter</kbd> · <kbd>Esc</kbd> annuleren</span>
            </template>
            <template v-else>
                <span>Sleep ankerpunten om te bewerken</span>
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
// Reuse the PaperScope that physics.ts initialised — never call Paper.setup() here
import { paperScope } from '@/model/physics'
// import PhysicsService from '@/model/physics'
import PhysicsService from '@/services/physics'

const PALETTE = [
'#FF3B5C', '#FF8C00', '#FFD700', '#00C896',
'#00AAFF', '#8B5CF6', '#FF6EB4', '#00E5CC',
'#FF5733', '#3DFF91', '#FF00FF', '#00FFFF',
]

const STORAGE_KEY = 'polygon_drawer_data'
const ANCHOR_RADIUS = 7
const INACTIVITY_MS = 2000

interface StoredPolygon {
    id: string
    points: { x: number; y: number }[]
    color: string
}

// Shorthand — after Physics is constructed, paperScope is always set
function p(): paper.PaperScope {
    if (!paperScope) throw new Error('paperScope not initialised — Physics must be constructed first')
    return paperScope
}

export default defineComponent({
    name: 'PolygonDrawer',
    
    setup() {
        const mode = ref<'draw' | 'edit'>('draw')
        const polygons = ref<StoredPolygon[]>([])
        const currentPoints = ref<{ x: number; y: number }[]>([])
        const isInactive = ref(false)
        const showMatterJS = ref(false)
        
        // PaperJS items — all inside a dedicated layer
        let drawingLayer: paper.Layer | null = null
        let paperPolygons: paper.Path[] = []
        let paperAnchors: paper.Shape[] = []
        let previewPath: paper.Path | null = null
        let previewLine: paper.Path | null = null
        
        // Edit drag state
        let draggingAnchor: paper.Shape | null = null
        let draggingPolyIndex = -1
        let draggingPointIndex = -1
        
        let inactivityTimer: ReturnType<typeof setTimeout> | null = null
            
            // ─── Helpers ─────────────────────────────────────────────────────────────
            function toggleMatterJSView(e: MouseEvent) {
                e.stopPropagation()
                const el = document.getElementById('physics')
                if (!el) return

                if (showMatterJS.value) {
                    el.style.display = 'none'
                    showMatterJS.value = false
                } else {
                    el.style.display = 'block'
                    showMatterJS.value = true
                }
            }

            function colorForIndex(i: number) { return PALETTE[i % PALETTE.length] }
            
            function getCanvas(): HTMLCanvasElement | null {
                return document.getElementById('paper') as HTMLCanvasElement | null
            }
            
            function canvasPoint(e: MouseEvent | Touch): paper.Point {
                const canvas = getCanvas()
                if (!canvas) return new (p().Point)(0, 0)
                const rect = canvas.getBoundingClientRect()
                return new (p().Point)(e.clientX - rect.left, e.clientY - rect.top)
            }
            
            // ─── Inactivity ───────────────────────────────────────────────────────────
            
            function resetInactivityTimer() {
                if (isInactive.value) {
                    isInactive.value = false
                    fadePolygons(false)
                }
                if (inactivityTimer) clearTimeout(inactivityTimer)
                inactivityTimer = setTimeout(() => {
                    isInactive.value = true
                    fadePolygons(true)
                }, INACTIVITY_MS)
            }
            
            function fadePolygons(hide: boolean) {
                if (!drawingLayer) return
                // Loop through all polygons and anchors in the Paper layer and adjust opacity
                const targetOpacity = hide ? 0 : 1
                paperPolygons.forEach(path => {
                    path.tween({ opacity: targetOpacity }, { duration: 300 })
                })
                paperAnchors.forEach(anchor => {
                    anchor.tween({ opacity: targetOpacity }, { duration: 300 })
                })
                p().view.update()
            }
            
            // ─── Storage ─────────────────────────────────────────────────────────────
            
            function save() {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(polygons.value))
            }
            
            function load(): StoredPolygon[] {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY)
                    return raw ? JSON.parse(raw) : []
                } catch { return [] }
            }
            
            // ─── Paper rendering ──────────────────────────────────────────────────────
            
            function clearPaperItems() {
                paperPolygons.forEach(path => path.remove())
                paperAnchors.forEach(a => a.remove())
                paperPolygons = []
                paperAnchors = []
            }
            
            function renderPolygons() {
                if (!drawingLayer) return
                drawingLayer.activate()
                clearPaperItems()
                
                polygons.value.forEach((poly, polyIdx) => {
                    if (poly.points.length < 3) return
                    
                    const P = p()
                    
                    const strokeCol = new P.Color(poly.color)
                    const fillCol   = new P.Color(poly.color)
                    fillCol.alpha   = 0.22
                    
                    const path = new P.Path({ closed: true, strokeColor: strokeCol, strokeWidth: 2, fillColor: fillCol })
                    poly.points.forEach(pt => path.add(new P.Point(pt.x, pt.y)))
                    paperPolygons.push(path)
                    
                    // Corner anchors
                    poly.points.forEach((pt, ptIdx) => {
                        const anchor = new P.Shape.Circle(new P.Point(pt.x, pt.y), ANCHOR_RADIUS) as unknown as paper.Shape
                        anchor.fillColor   = new P.Color('white')
                        anchor.strokeColor = new P.Color(poly.color)
                        anchor.strokeWidth = 2
                        ;(anchor as any).data = { polyIdx, ptIdx }
                        paperAnchors.push(anchor)
                    })
                })
                
                p().view.update()
            }
            
            function renderPreview(mousePos?: paper.Point) {
                if (!drawingLayer) return
                drawingLayer.activate()
                const P = p()
                
                if (previewPath) { previewPath.remove(); previewPath = null }
                if (previewLine) { previewLine.remove(); previewLine = null }
                
                if (currentPoints.value.length === 0) { P.view.update(); return }
                
                const color = colorForIndex(polygons.value.length)
                
                if (currentPoints.value.length >= 2) {
                    previewPath = new P.Path()
                    previewPath.strokeColor = new P.Color(color)
                    previewPath.strokeWidth = 2
                    previewPath.opacity     = 0.7
                    previewPath.dashArray   = [6, 4]
                    currentPoints.value.forEach(pt => previewPath!.add(new P.Point(pt.x, pt.y)))
                }
                
                if (mousePos && currentPoints.value.length >= 1) {
                    const last = currentPoints.value[currentPoints.value.length - 1]
                    
                    // Snap ring when hovering near first point
                    const isSnapping =
                    currentPoints.value.length >= 3 &&
                    Math.hypot(mousePos.x - currentPoints.value[0].x, mousePos.y - currentPoints.value[0].y) < ANCHOR_RADIUS * 2.5
                    
                    if (isSnapping) {
                        const ring = new P.Shape.Circle(new P.Point(currentPoints.value[0].x, currentPoints.value[0].y), ANCHOR_RADIUS + 5) as unknown as paper.Path
                        ;(ring as any).strokeColor = new P.Color(color)
                        ;(ring as any).strokeWidth = 2
                        ;(ring as any).fillColor   = null
                        previewLine = ring
                    } else {
                        previewLine = new P.Path()
                        previewLine.strokeColor = new P.Color(color)
                        previewLine.strokeWidth = 1.5
                        previewLine.opacity     = 0.5
                        previewLine.dashArray   = [4, 4]
                        previewLine.add(new P.Point(last.x, last.y))
                        previewLine.add(mousePos)
                    }
                }
                
                P.view.update()
            }
            
            // ─── Physics sync ─────────────────────────────────────────────────────────
            
            /**
            * Register/update ALL current polygons in MatterJS.
            * Called once after load and after every change.
            */
            function syncAllToPhysics() {
                const physics = PhysicsService.physics
                if (!physics) return
                polygons.value.forEach(poly => {
                    physics.updatePolygon(poly.id, poly.points)
                })
            }
            
            function addPolygonToPhysics(poly: StoredPolygon) {
                PhysicsService.physics?.addPolygon(poly.id, poly.points)
            }
            
            function updatePolygonInPhysics(poly: StoredPolygon) {
                PhysicsService.physics?.updatePolygon(poly.id, poly.points)
            }
            
            function removePolygonFromPhysics(id: string) {
                PhysicsService.physics?.removePolygon(id)
            }
            
            // ─── Draw / close / cancel ────────────────────────────────────────────────
            
            function closePolygon() {
                if (currentPoints.value.length < 3) return
                
                const id    = `polygon_${Date.now()}`
                const color = colorForIndex(polygons.value.length)
                const poly: StoredPolygon = { id, points: [...currentPoints.value], color }
                
                polygons.value.push(poly)
                addPolygonToPhysics(poly)
                
                currentPoints.value = []
                if (previewPath) { previewPath.remove(); previewPath = null }
                if (previewLine) { previewLine.remove(); previewLine = null }
                renderPolygons()
                save()
            }
            
            function cancelDraw() {
                currentPoints.value = []
                if (previewPath) { previewPath.remove(); previewPath = null }
                if (previewLine) { previewLine.remove(); previewLine = null }
                p().view.update()
            }
            
            // ─── Mouse events (canvas) ────────────────────────────────────────────────
            
            function onMouseMove(e: MouseEvent) {
                
                if (mode.value === 'draw') {
                    renderPreview(canvasPoint(e))
                } else if (mode.value === 'edit' && draggingAnchor) {
                    const pt = canvasPoint(e)
                    draggingAnchor.position = pt
                    
                    const poly = polygons.value[draggingPolyIndex]
                    poly.points[draggingPointIndex] = { x: pt.x, y: pt.y }
                    
                    // Live-update Paper path segment
                    const path = paperPolygons[draggingPolyIndex]
                    if (path) path.segments[draggingPointIndex].point = pt
                    
                    p().view.update()
                }
            }
            
            function onMouseDown(e: MouseEvent) {
                const pt = canvasPoint(e)
                
                const target = e.target as HTMLElement
                if (target) {
                    const parent = target.closest('.tool-btn') as HTMLElement | null
                    if (parent?.innerText?.toLowerCase() == "toggle matterjs") return
                }
                
                if (PhysicsService.mouseTarget) {
                    return
                }
                
                if (mode.value === 'draw') {
                    if (currentPoints.value.length >= 3) {
                        const first = currentPoints.value[0]
                        if (Math.hypot(pt.x - first.x, pt.y - first.y) < ANCHOR_RADIUS * 2.5) {
                            closePolygon(); return
                        }
                    }
                    currentPoints.value.push({ x: pt.x, y: pt.y })
                    renderPreview(pt)
                } else if (mode.value === 'edit') {
                    for (const anchor of paperAnchors) {
                        if (anchor.position.subtract(pt).length < ANCHOR_RADIUS * 2) {
                            draggingAnchor     = anchor
                            draggingPolyIndex  = (anchor as any).data.polyIdx
                            draggingPointIndex = (anchor as any).data.ptIdx
                            break
                        }
                    }
                }
            }
            
            function onMouseUp(_e: MouseEvent) {
                if (draggingAnchor) {
                    // Persist updated points and sync physics
                    const poly = polygons.value[draggingPolyIndex]
                    if (poly) updatePolygonInPhysics(poly)
                    save()
                    draggingAnchor     = null
                    draggingPolyIndex  = -1
                    draggingPointIndex = -1
                }
            }
            
            // ─── Touch events (canvas) ────────────────────────────────────────────────
            
            function onTouchStart(e: TouchEvent) {
                e.preventDefault()
                const pt = canvasPoint(e.touches[0])
                
                if (mode.value === 'draw') {
                    if (currentPoints.value.length >= 3) {
                        const first = currentPoints.value[0]
                        if (Math.hypot(pt.x - first.x, pt.y - first.y) < ANCHOR_RADIUS * 3) {
                            closePolygon(); return
                        }
                    }
                    currentPoints.value.push({ x: pt.x, y: pt.y })
                    renderPreview(pt)
                } else if (mode.value === 'edit') {
                    for (const anchor of paperAnchors) {
                        if (anchor.position.subtract(pt).length < ANCHOR_RADIUS * 3) {
                            draggingAnchor     = anchor
                            draggingPolyIndex  = (anchor as any).data.polyIdx
                            draggingPointIndex = (anchor as any).data.ptIdx
                            break
                        }
                    }
                }
            }
            
            function onTouchMove(e: TouchEvent) {
                e.preventDefault()
                const pt = canvasPoint(e.touches[0])
                
                if (mode.value === 'draw') {
                    renderPreview(pt)
                } else if (mode.value === 'edit' && draggingAnchor) {
                    draggingAnchor.position = pt
                    const poly = polygons.value[draggingPolyIndex]
                    poly.points[draggingPointIndex] = { x: pt.x, y: pt.y }
                    const path = paperPolygons[draggingPolyIndex]
                    if (path) path.segments[draggingPointIndex].point = pt
                    p().view.update()
                }
            }
            
            function onTouchEnd(_e: TouchEvent) {
                if (draggingAnchor) {
                    const poly = polygons.value[draggingPolyIndex]
                    if (poly) updatePolygonInPhysics(poly)
                    save()
                    draggingAnchor = null
                }
            }
            
            // ─── Keyboard ─────────────────────────────────────────────────────────────
            
            function onKeyDown(e: KeyboardEvent) {
                switch (e.key) {
                    case 'Escape': cancelDraw(); break
                    case 'Enter':  if (currentPoints.value.length >= 3) closePolygon(); break
                    case 'd': case 'D': setMode('draw'); break
                    case 'e': case 'E': setMode('edit'); break
                    // case 'r': case 'R': resetAll(); break
                }
            }
            
            // ─── Public actions ───────────────────────────────────────────────────────
            
            function setMode(m: 'draw' | 'edit') {
                mode.value = m
                cancelDraw()
            }
            
            function resetAll() {
                cancelDraw()
                // Remove all Matter bodies
                PhysicsService.physics?.clearPolygons()
                polygons.value = []
                clearPaperItems()
                localStorage.removeItem(STORAGE_KEY)
                p().view.update()
            }
            
            // ─── Lifecycle ────────────────────────────────────────────────────────────
            
            onMounted(() => {
                // physics.ts already called Paper.setup() — just open a new layer
                drawingLayer      = new (p().Layer)()
                drawingLayer.name = 'polygon-drawer'
                
                // Load persisted data, render visuals, register Matter bodies
                polygons.value = load()
                renderPolygons()
                syncAllToPhysics()

                // Canvas events
                window.addEventListener('mousedown',  onMouseDown)
                window.addEventListener('mousemove',  onMouseMove)
                window.addEventListener('mouseup',    onMouseUp)
                window.addEventListener('touchstart', onTouchStart, { passive: false })
                window.addEventListener('touchmove',  onTouchMove,  { passive: false })
                window.addEventListener('touchend',   onTouchEnd)
                
                // Global activity — resets inactivity timer from anywhere on the page
                window.addEventListener('mousemove',  resetInactivityTimer)
                window.addEventListener('mousedown',  resetInactivityTimer)
                window.addEventListener('click',      resetInactivityTimer)
                window.addEventListener('touchstart', resetInactivityTimer, { passive: true })
                window.addEventListener('keydown',    onKeyDown)
                
                resetInactivityTimer()
            })
            
            onBeforeUnmount(() => {
                window.removeEventListener('mousemove',  onMouseMove)
                window.removeEventListener('mousedown',  onMouseDown)
                window.removeEventListener('mouseup',    onMouseUp)
                window.removeEventListener('touchstart', onTouchStart)
                window.removeEventListener('touchmove',  onTouchMove)
                window.removeEventListener('touchend',   onTouchEnd)
                
                window.removeEventListener('mousemove',  resetInactivityTimer)
                window.removeEventListener('mousedown',  resetInactivityTimer)
                window.removeEventListener('click',      resetInactivityTimer)
                window.removeEventListener('touchstart', resetInactivityTimer)
                window.removeEventListener('keydown',    onKeyDown)
                
                if (inactivityTimer) clearTimeout(inactivityTimer)
                
                clearPaperItems()
                if (previewPath) previewPath.remove()
                if (previewLine) previewLine.remove()
                drawingLayer?.remove()
            })
            
            return { mode, polygons, currentPoints, isInactive, showMatterJS, toggleMatterJSView, setMode, resetAll }
        },
    })
</script>

<style scoped>
.polygon-drawer {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 100;
    font-family: 'DM Mono', 'Fira Mono', monospace;
}

.toolbar {
    pointer-events: all;
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(10,10,12,0.82);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 8px 12px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.4);
    transition: opacity 0.6s ease, transform 0.6s ease;
}
.toolbar.hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-50%) translateY(-8px);
}

.tool-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 7px;
    color: rgba(255,255,255,0.55);
    font-family: inherit; font-size: 11px; letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}
.tool-btn:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
.tool-btn.active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15); color: #fff; }
.reset-btn:hover { background: rgba(255,59,92,0.15); border-color: rgba(255,59,92,0.3); color: #FF3B5C; }

.separator { width: 1px; height: 20px; background: rgba(255,255,255,0.1); margin: 0 4px; }

.polygon-count { font-size: 10px; color: rgba(255,255,255,0.3); padding-left: 4px; letter-spacing: 0.06em; }

.hint {
    pointer-events: none;
    position: fixed;
    bottom: 24px; left: 50%;
    transform: translateX(-50%);
    background: rgba(10,10,12,0.72);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.04em;
    transition: opacity 0.6s ease, transform 0.6s ease;
    white-space: nowrap;
}
.hint.hidden { opacity: 0; transform: translateX(-50%) translateY(6px); }

.hint kbd {
    display: inline-block;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 4px; padding: 1px 5px;
    font-family: inherit; font-size: 10px; color: rgba(255,255,255,0.55);
}
</style>