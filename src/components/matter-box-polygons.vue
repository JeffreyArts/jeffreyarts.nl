<template>
    
    <div id="matter-box">
        <div class="polygon-drawer">
            <div class="toolbar" :class="{ hidden: isInactive }">
                <button class="tool-btn" :class="{ active: mode === 'drawing' }" @click="setMode('drawing')" title="Teken (D)">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <polygon points="9,2 16,13 2,13" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <circle cx="9" cy="2" r="1.5" fill="currentColor"/>
                        <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
                        <circle cx="2" cy="13" r="1.5" fill="currentColor"/>
                    </svg>
                    <span>Teken</span>
                </button>

                <button class="tool-btn" :class="{ active: mode === 'play' }" @click="setMode('play')" title="Speel (P)">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <polygon points="4,2 16,9 4,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                    <span>Speel</span>
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
        </div>
        
        <!-- Matter container -->
        <section id="catterpillar" ref="catterpillar"></section>

    </div>
</template>



<script lang="ts">
import { defineComponent, type PropType } from "vue"
import { MatterController } from "@/model/physics/controller"
import { gsap } from "gsap"
import _ from "lodash"
import jaoIcon from "./jao-icon.vue"

import useStoryStore from "@/stores/story"
import useIdentityStore from "@/stores/identity"
import { type IdentityField } from "@/model/catterpillar/identity"
import { Polygon } from "@/model/physics/polygon"
import { PolygonObjectModel } from "@/model/physics/draw"

const PALETTE = [
    '#FF3B5C', '#FF8C00', '#FFD700', '#00C896',
    '#00AAFF', '#8B5CF6', '#FF6EB4', '#00E5CC',
    '#FF5733', '#3DFF91', '#FF00FF', '#00FFFF',
]

const STORAGE_KEY = 'polygon_drawer_data'
const INACTIVITY_MS = 2000

export default defineComponent({
    props: {
        identity: {
            type: Object as PropType<IdentityField>,
            required: true
        }
    },
    components: {
        jaoIcon
    },
    data() {
        return {
            controller: null as MatterController | null,
            dev: true,
            polygons: [] as Partial<Polygon>[],
            palletteIndex: 0,
            newPolygon: undefined as undefined | { currentPoints: Array<{ x: number; y: number }>, color: string },
            // ── Polygon drawer ──────────────────────────────────────────
            mousePos: null as { x: number; y: number } | null,dragTarget: null as { obj: PolygonObjectModel, pointIndex: number, originalPoints: { x: number; y: number }[] } | null,
            inactivityTimer: null as ReturnType<typeof setTimeout> | null,
            mode: 'drawing' as 'drawing' | 'play',
            isInactive: false,
            isMouseDown: false,
        }
    },
    watch: {
        "identity.id": {
            handler() {
                console.log("Identity changed, updating MatterBox", this.identity)
                this.addCatterpillar()
                this.start()
            },
            immediate: true
        },
    },
    setup() {
        const identityStore = useIdentityStore()
        const storyStore = useStoryStore()
        return {
            identityStore,
            storyStore,
        }
    },
    async mounted() {
        const offsetBottom = 0
        const startPosition = {
            x: window.innerWidth / 2,
            y: window.innerHeight - offsetBottom - this.identity.thickness
        }

        this.controller = new MatterController(this.$refs["catterpillar"] as HTMLElement, {
            identity: this.identity,
            catterpillarPos: startPosition,
            offsetBottom: 2
        })
        this.addCatterpillar()

        // ── Polygon drawer events ────────────────────────────────────
        window.addEventListener('mousedown',  this.onMouseDown)
        window.addEventListener('mouseup',    this.onMouseUp)
        window.addEventListener('touchstart', this.onTouchStart, { passive: false })
        window.addEventListener('keydown',    this.onKeyDown)
        window.addEventListener('mousemove',  this.onMouseMove)

        window.addEventListener('mousemove',  this.resetInactivityTimer)
        window.addEventListener('mousedown',  this.resetInactivityTimer)
        window.addEventListener('click',      this.resetInactivityTimer)
        window.addEventListener('touchstart', this.resetInactivityTimer, { passive: true })

        this.resetInactivityTimer()

        // ── Restore polygons from localStorage ───────────────────────
        this.polygons = this.loadPolygonsFromLocalStorage()
        this.polygons.forEach(poly => {
            if (this.controller && poly instanceof Polygon) {
                const polygon = this.controller.draw.addPolygon(poly)
                polygon.showAnchors = true
                
            }
        })
    },
    
    unmounted() {
        if (this.controller) {
            this.controller.destroy()
            this.controller = null
        }

        // ── Polygon drawer events ────────────────────────────────────
        window.removeEventListener('mousedown',  this.onMouseDown)
        window.removeEventListener('mouseup',    this.onMouseUp)
        window.removeEventListener('touchstart', this.onTouchStart)
        window.removeEventListener('keydown',    this.onKeyDown)
        window.removeEventListener('mousemove',  this.onMouseMove)

        window.removeEventListener('mousemove',  this.resetInactivityTimer)
        window.removeEventListener('mousedown',  this.resetInactivityTimer)
        window.removeEventListener('click',      this.resetInactivityTimer)
        window.removeEventListener('touchstart', this.resetInactivityTimer)

        if (this.inactivityTimer) clearTimeout(this.inactivityTimer)

        // ── Destroy all polygon instances ────────────────────────────
        this.polygons.forEach(poly => {
            if (poly instanceof Polygon) poly.destroy()
        })
        this.polygons = []
    },
    methods: {
        
        // ── Coordinate helper ────────────────────────────────────────
        canvasPoint(e: MouseEvent | Touch): { x: number; y: number } {
            const el = this.$refs["catterpillar"] as HTMLElement | undefined
            if (!el) return { x: 0, y: 0 }
            const rect = el.getBoundingClientRect()
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        },

        // ── Inactivity ───────────────────────────────────────────────
        resetInactivityTimer() {
            this.isInactive = false
            if (this.inactivityTimer) clearTimeout(this.inactivityTimer)
            this.inactivityTimer = setTimeout(() => {
                this.isInactive = true
            }, INACTIVITY_MS)
        },

        // ── Mode ─────────────────────────────────────────────────────
        setMode(m: 'drawing' | 'play') {
            this.mode = m
            this.cancelDraw()
            this.dragTarget = null

            this.controller?.draw.objects
                .filter(o => o.type === 'polygon')
                .forEach(o => {
                    (o as PolygonObjectModel).showAnchors = m === 'drawing'
                })
        },
        
        // ── Draw / close / cancel ────────────────────────────────────
        cancelDraw() {
            this.newPolygon = undefined
            if (this.controller?.draw.previewObj) {
                this.controller.draw.previewObj.model = undefined
            }
        },

        closePolygon() {
            if (!this.newPolygon) return
            if (!this.controller?.ref.world) return
            if (this.newPolygon.currentPoints.length < 3) return

            if (this.controller?.draw.previewObj) {
                this.controller.draw.previewObj.model = undefined
            }

            const poly = new Polygon({
                id: `polygon-${Date.now()}`,
                points: this.newPolygon.currentPoints.map(p => ({
                    x: p.x,
                    y: p.y
                })),
                color: this.newPolygon.color
            }, this.controller.ref.world)
            
            const obj = this.controller.draw.addPolygon(poly)
            obj.showAnchors = this.mode === 'drawing'
            this.newPolygon = undefined
            this.savePolygonsToLocalStorage(this.polygons)
        },

        toggleEditMode() {
            if (this.mode === 'play') return
            this.cancelDraw()
            this.dragTarget = null

            this.controller?.draw.objects
                .filter(o => o.type === 'polygon')
                .forEach(o => {
                    (o as PolygonObjectModel).showAnchors = true
                })
        },

        // ── Mouse events ─────────────────────────────────────────────
        
        onMouseDown(e: MouseEvent) {
            if ((e.target as HTMLElement)?.closest('.tool-btn')) return
            if (this.mode === 'play') return

            this.isMouseDown = true
            const pt = this.canvasPoint(e)

            // Try to hit an anchor first
            const polygons = this.controller?.draw.objects.filter(o => o.type === 'polygon') as PolygonObjectModel[]
            if (polygons) {
                for (const obj of polygons) {
                    if (!obj.model || !obj.two) continue
                    const hit = obj.two.anchors.findIndex(a =>
                        Math.hypot(pt.x - a.position.x, pt.y - a.position.y) < 12
                    )
                    if (hit !== -1) {
                        this.dragTarget = {
                            obj,
                            pointIndex: hit,
                            originalPoints: [...obj.model.points.map(p => ({ ...p }))]
                        }
                        return
                    }
                }
            }

            // No anchor hit — draw a point
            if (!this.newPolygon) {
                this.newPolygon = {
                    currentPoints: [pt],
                    color: PALETTE[this.polygons.length % PALETTE.length],
                }
                return
            }

            const first = this.newPolygon.currentPoints[0]
            if (
                this.newPolygon.currentPoints.length >= 3 &&
                Math.hypot(pt.x - first.x, pt.y - first.y) < 17.5
            ) {
                this.closePolygon()
                return
            }

            this.newPolygon.currentPoints.push(pt)
        },

        onMouseUp(_e: MouseEvent) {
            this.isMouseDown = false

                if (this.dragTarget) {
                    this.savePolygonsToLocalStorage(this.polygons)
                    this.dragTarget = null
                } else {
                    this.savePolygonsToLocalStorage(this.polygons)
                }
            },

            onMouseMove(e: MouseEvent) {
        if (this.mode === 'play') return

        this.mousePos = this.canvasPoint(e)

        if (this.dragTarget && this.isMouseDown) {
            const { obj, pointIndex } = this.dragTarget

            if (!obj.model || !this.mousePos) return

            // 🔥 FULL IMMUTABLE COPY
            const next = obj.model.points.map(p => ({
                x: p.x,
                y: p.y
            }))

            next[pointIndex] = {
                x: this.mousePos.x,
                y: this.mousePos.y
            }

            obj.model.updatePoints(next)

            return
        }

        // DRAWING PREVIEW
        if (!this.newPolygon || !this.controller) return

        const draw = this.controller.draw

        const previewPoints = this.newPolygon.currentPoints.map(p => ({
            x: p.x,
            y: p.y
        }))

        if (!draw.previewObj) {
            draw.addPolygonPreview(
                previewPoints,
                this.mousePos,
                this.newPolygon.color
            )
        } else if (draw.previewObj.model) {
            draw.previewObj.model.points = previewPoints
            draw.previewObj.model.mousePos = this.mousePos
            draw.previewObj.model.color = this.newPolygon.color
        }
    },

        // ── Touch events ─────────────────────────────────────────────
        onTouchStart(e: TouchEvent) {
            e.preventDefault()
            if (this.mode !== 'drawing') return

            const pt = this.canvasPoint(e.touches[0])

            if (!this.newPolygon) {
                this.newPolygon = {
                    currentPoints: [pt],
                    color: PALETTE[this.polygons.length % PALETTE.length],
                }
                return
            }

            const first = this.newPolygon.currentPoints[0]
            if (
                this.newPolygon.currentPoints.length >= 3 &&
                Math.hypot(pt.x - first.x, pt.y - first.y) < 21
            ) {
                this.closePolygon()
                return
            }

            this.newPolygon.currentPoints.push(pt)
        },
        

        // ── Keyboard ─────────────────────────────────────────────────
        onKeyDown(e: KeyboardEvent) {
            switch (e.key) {
                case 'Escape':
                    if (this.dragTarget) {
                        const model = this.dragTarget.obj.model!
                        model.updatePoints([...this.dragTarget.originalPoints])
                        this.dragTarget = null
                    } else {
                        this.cancelDraw()
                    }
                    break
                case 'Enter':
                    if (this.dragTarget) {
                        this.dragTarget.obj.model?.updatePoints([...this.dragTarget.obj.model.points])
                        this.dragTarget = null
                        this.savePolygonsToLocalStorage(this.polygons)
                    } else if (this.newPolygon && this.newPolygon.currentPoints.length >= 3) {
                        this.closePolygon()
                    }
                    break
                case 'p': case 'P': this.setMode('play'); break
                case 'd': case 'D': this.setMode('drawing'); break
            }
        },

        // ── Reset ────────────────────────────────────────────────────
        resetAll() {
            this.cancelDraw()
            this.polygons.forEach(poly => {
                if (poly instanceof Polygon) poly.destroy()
            })
            this.polygons = []
            localStorage.removeItem(STORAGE_KEY)
        },

        // ── Storage ──────────────────────────────────────────────────
        loadPolygonsFromLocalStorage(): Polygon[] {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                if (!raw || !this.controller?.ref.world) return []
                const data = JSON.parse(raw) as { id: string; points: { x: number; y: number }[]; color: string }[]

                
                return data.map(d => {
                    const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length
                    const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length
                    return new Polygon({
                        x: cx, y: cy,
                        id: d.id,
                        points: d.points,
                        color: d.color,
                    }, this.controller!.ref.world)
                })
            } catch { return [] }
        },

        savePolygonsToLocalStorage(polygons: Partial<Polygon>[]) {
            const serializable = polygons.map(poly => ({
                id: poly.id,
                points: poly.points,
                color: poly.color,
            }))
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
        },

        // ── Catterpillar ─────────────────────────────────────────────
        async start() {
            await this.storyStore.initialised
            if (window.location.search.includes("dev")) {
                this.toggleDevMode()
            }
            await this.storyStore.updateConditionalStories()
            console.info("=== 🦩 Starting passive stories ===")
            await this.storyStore.setActiveStory("wall-slam")
            await this.storyStore.setActiveStory("petting")
            await this.storyStore.setActiveStory("move-towards-mouse")
            await this.storyStore.setActiveStory("blocks")
            setTimeout(() => {
                console.info("================================")
                console.info("")
            })
        },

        addCatterpillar() {
            if (this.controller) {
                const width = this.controller.ref.renderer.options.width || 100
                this.controller.catterpillar.destroy()
                this.controller.createCatterpillar({ x: width / 2, y: 0 }, { identity: this.identity })
            }
        },

        toggleDevMode() {
            this.dev = !this.dev
            const twoEl = this.$el.querySelector("[id^='two-js']") as HTMLCanvasElement
            const rendererEl = this.$el.querySelector("#matter") as HTMLCanvasElement
            gsap.to(twoEl, { duration: 0.3, opacity: this.dev ? 0 : 1 })
            gsap.to(rendererEl, { duration: 0.3, opacity: this.dev ? 1 : 0 })
        },
    }
})
</script>


<style> 
#matter-box, .polygon-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1990;

    #matter {
        opacity: 1;
    }
    #two-js {
        opacity: 1;
    }
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
</style>