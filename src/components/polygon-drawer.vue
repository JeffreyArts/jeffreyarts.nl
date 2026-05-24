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
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { Polygon } from '@/model/physics/polygon'
import PhysicsService from '@/services/physics'

const PALETTE = [
    '#FF3B5C', '#FF8C00', '#FFD700', '#00C896',
    '#00AAFF', '#8B5CF6', '#FF6EB4', '#00E5CC',
    '#FF5733', '#3DFF91', '#FF00FF', '#00FFFF',
]

const STORAGE_KEY = 'polygon_drawer_data'
const INACTIVITY_MS = 2000

interface StoredPolygon {
    id: string
    points: { x: number; y: number }[]
    color: string
}

export default defineComponent({
    name: 'PolygonDrawer',

    setup() {
        const mode = ref<'draw' | 'edit'>('draw')
        const polygons = ref<StoredPolygon[]>([])
        const currentPoints = ref<{ x: number; y: number }[]>([])
        const isInactive = ref(false)

        const polygonInstances = new Map<string, Polygon>()

        let inactivityTimer: ReturnType<typeof setTimeout> | null = null

        // ─── Helpers ──────────────────────────────────────────────────────────────

        function colorForIndex(i: number) { return PALETTE[i % PALETTE.length] }

        function canvasPoint(e: MouseEvent | Touch): { x: number; y: number } {
            const canvas = document.getElementById('paper') as HTMLCanvasElement | null
            if (!canvas) return { x: 0, y: 0 }
            const rect = canvas.getBoundingClientRect()
            return { x: e.clientX - rect.left, y: e.clientY - rect.top }
        }

        // ─── Inactivity ───────────────────────────────────────────────────────────

        function resetInactivityTimer() {
            isInactive.value = false
            if (inactivityTimer) clearTimeout(inactivityTimer)
            inactivityTimer = setTimeout(() => {
                isInactive.value = true
            }, INACTIVITY_MS)
        }

        // ─── Storage ──────────────────────────────────────────────────────────────

        function save() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(polygons.value))
        }

        function load(): StoredPolygon[] {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                return raw ? JSON.parse(raw) : []
            } catch { return [] }
        }

        // ─── Polygon instances ────────────────────────────────────────────────────

        function addPolygonInstance(poly: StoredPolygon) {
            const world = PhysicsService.physics?.world
            if (!world) return
            polygonInstances.set(poly.id, new Polygon({ id: poly.id, points: poly.points, color: poly.color }, world))
        }

        function updatePolygonInstance(poly: StoredPolygon) {
            const instance = polygonInstances.get(poly.id)
            if (instance) {
                instance.update(poly.points)
            } else {
                addPolygonInstance(poly)
            }
        }

        function syncAllInstances() {
            polygons.value.forEach(poly => addPolygonInstance(poly))
        }

        // ─── Draw / close / cancel ────────────────────────────────────────────────

        function closePolygon() {
            if (currentPoints.value.length < 3) return

            const poly: StoredPolygon = {
                id: `polygon_${Date.now()}`,
                points: [...currentPoints.value],
                color: colorForIndex(polygons.value.length),
            }

            polygons.value.push(poly)
            addPolygonInstance(poly)
            currentPoints.value = []
            save()
        }

        function cancelDraw() {
            currentPoints.value = []
        }

        // ─── Mouse events ─────────────────────────────────────────────────────────

        function onMouseDown(e: MouseEvent) {
            if ((e.target as HTMLElement)?.closest('.tool-btn')) return
            if (PhysicsService.mouseTarget) return

            const pt = canvasPoint(e)

            if (mode.value === 'draw') {
                if (currentPoints.value.length >= 3) {
                    const first = currentPoints.value[0]
                    if (Math.hypot(pt.x - first.x, pt.y - first.y) < 17.5) {
                        closePolygon(); return
                    }
                }
                currentPoints.value.push(pt)
            }
        }

        function onMouseUp(_e: MouseEvent) {
            // edit drag end — save after anchor drag handled by drawing layer
            save()
        }

        // ─── Touch events ─────────────────────────────────────────────────────────

        function onTouchStart(e: TouchEvent) {
            e.preventDefault()
            const pt = canvasPoint(e.touches[0])

            if (mode.value === 'draw') {
                if (currentPoints.value.length >= 3) {
                    const first = currentPoints.value[0]
                    if (Math.hypot(pt.x - first.x, pt.y - first.y) < 21) {
                        closePolygon(); return
                    }
                }
                currentPoints.value.push(pt)
            }
        }

        // ─── Keyboard ─────────────────────────────────────────────────────────────

        function onKeyDown(e: KeyboardEvent) {
            switch (e.key) {
                case 'Escape': cancelDraw(); break
                case 'Enter':  if (currentPoints.value.length >= 3) closePolygon(); break
                case 'd': case 'D': setMode('draw'); break
                case 'e': case 'E': setMode('edit'); break
            }
        }

        // ─── Public actions ───────────────────────────────────────────────────────

        function setMode(m: 'draw' | 'edit') {
            mode.value = m
            cancelDraw()
        }

        function resetAll() {
            cancelDraw()
            polygonInstances.forEach(instance => instance.destroy())
            polygonInstances.clear()
            polygons.value = []
            localStorage.removeItem(STORAGE_KEY)
        }

        // ─── Lifecycle ────────────────────────────────────────────────────────────

        onMounted(() => {
            polygons.value = load()
            syncAllInstances()

            window.addEventListener('mousedown',  onMouseDown)
            window.addEventListener('mouseup',    onMouseUp)
            window.addEventListener('touchstart', onTouchStart, { passive: false })
            window.addEventListener('keydown',    onKeyDown)

            window.addEventListener('mousemove',  resetInactivityTimer)
            window.addEventListener('mousedown',  resetInactivityTimer)
            window.addEventListener('click',      resetInactivityTimer)
            window.addEventListener('touchstart', resetInactivityTimer, { passive: true })

            resetInactivityTimer()
        })

        onBeforeUnmount(() => {
            window.removeEventListener('mousedown',  onMouseDown)
            window.removeEventListener('mouseup',    onMouseUp)
            window.removeEventListener('touchstart', onTouchStart)
            window.removeEventListener('keydown',    onKeyDown)

            window.removeEventListener('mousemove',  resetInactivityTimer)
            window.removeEventListener('mousedown',  resetInactivityTimer)
            window.removeEventListener('click',      resetInactivityTimer)
            window.removeEventListener('touchstart', resetInactivityTimer)

            if (inactivityTimer) clearTimeout(inactivityTimer)

            polygonInstances.forEach(instance => instance.destroy())
            polygonInstances.clear()
        })

        return { mode, polygons, currentPoints, isInactive, setMode, resetAll }
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
</style>