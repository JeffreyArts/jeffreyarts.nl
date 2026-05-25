<template>
    <div id="matter-box-polygons">
        <section id="catterpillar" ref="catterpillar"></section>

        <!-- Draw overlay -->
        <svg
            v-if="polygonMode === 'draw'"
            id="draw-overlay"
            @click="addDraftPoint"
            @mousemove="updateCursor"
            @dblclick.prevent="confirmPolygon"
        >
            <circle
                v-for="(pt, i) in draftPoints"
                :key="i"
                :cx="pt.x"
                :cy="pt.y"
                r="5"
                fill="#FF3B5C"
                stroke="white"
                stroke-width="1.5"
                style="cursor: pointer"
                @click.stop="i === 0 && draftPoints.length >= 3 ? confirmPolygon() : null"
            />
        </svg>

        

        <!-- Polygon toolbar -->
         <div id="polygon-toolbar" @mouseenter="toolbarVisible = true" @mouseleave="polygonMode === 'play' ? toolbarVisible = false : null" :class="{ hidden: !toolbarVisible && polygonMode === 'play' }">
            
            <button class="tool-btn" :class="{ active: polygonMode === 'draw' }" @click="setMode('draw')" title="Draw polygon (D)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <polygon points="9,2 16,7 13,15 5,15 2,7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </button>

            <button class="tool-btn" :class="{ active: polygonMode === 'edit' }" @click="setMode('edit')" title="Edit (E)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 12.5V15h2.5l7.4-7.4-2.5-2.5L3 12.5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <path d="M13.2 4.3l.5-.5a1 1 0 0 1 1.4 1.4l-.5.5-1.4-1.4z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </button>

            <button class="tool-btn" :class="{ active: polygonMode === 'play' }" @click="setMode('play')" title="Play (P)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M5 3l11 6-11 6V3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
                </svg>
            </button>

            <button class="tool-btn danger" @click="deleteAllPolygons" title="Delete all (Del)">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 5h12M7 5V3h4v2M6 5l1 10h4l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>

            <div class="tool-divider" v-if="polygonMode === 'draw' && draftPoints.length > 0" />

            <button
                v-if="polygonMode === 'draw' && draftPoints.length >= 3"
                class="tool-btn confirm"
                @click="confirmPolygon"
                title="Confirm (Enter)"
            >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9l4.5 4.5L15 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
            <button
                v-if="polygonMode === 'draw' && draftPoints.length > 0"
                class="tool-btn"
                @click="cancelDraft"
                title="Cancel (Esc)"
            >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue"
import { MatterController } from "@/model/physics/controller"
import { Polygon } from "@/model/physics/polygon"
import { gsap } from "gsap"

import useStoryStore from "@/stores/story"
import useIdentityStore from "@/stores/identity"
import { PolygonObjectModel } from "@/model/physics/draw"
import { type IdentityField } from "@/model/catterpillar/identity"

type Point = { x: number; y: number }

const STORAGE_KEY = "catterpillar:polygons"

// ── Serialisation helpers ─────────────────────────────────────────────────────

interface StoredPolygon {
    id: string
    points: Point[]
    color: string
}

function savePolygons(polygons: Record<string, Polygon>) {
    const data: StoredPolygon[] = Object.values(polygons).map(p => ({
        id: p.id,
        points: p.points.map(pt => ({ ...pt })),
        color: p.color,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadStoredPolygons(): StoredPolygon[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as StoredPolygon[]
    } catch {
        return []
    }
}

export default defineComponent({
    props: {
        identity: {
            type: Object as PropType<IdentityField>,
            required: true,
        },
    },
    data() {
        return {
            controller: null as MatterController | null,
            dev: true,

            // id → Polygon instance (physics + draw)
            polygons: {} as Record<string, Polygon>,

            // Draw mode
            polygonMode: "none" as "none" | "draw" | "edit" | "play",
            toolbarVisible: false,
            draftPoints: [] as Point[],
            cursor: null as Point | null,

            // Edit mode
            editPoints: [] as Point[],
            draggingPolygonId: null as string | null,
            draggingVertexIndex: null as number | null,
        }
    },
    watch: {
        "identity.id": {
            handler() {
                this.addCatterpillar()
                this.start()
            },
            immediate: true,
        },
    },
    setup() {
        const identityStore = useIdentityStore()
        const storyStore = useStoryStore()
        return { identityStore, storyStore }
    },
    async mounted() {
        const offsetBottom = 0
        const startPosition = {
            x: window.innerWidth / 2,
            y: window.innerHeight - offsetBottom - this.identity.thickness,
        }

        this.controller = new MatterController(this.$refs["catterpillar"] as HTMLElement, {
            identity: this.identity,
            catterpillarPos: startPosition,
            offsetBottom: 2,
        })

        this.addCatterpillar()
        this.restorePolygons()

        window.addEventListener("mousedown", this.onMouseDown)
        window.addEventListener("mousemove", this.onGlobalMouseMove)
        window.addEventListener("mouseup", this.onGlobalMouseUp)
        window.addEventListener("keydown", this.onKeyDown)
    },
    unmounted() {
        if (this.controller) {
            this.controller.destroy()
            this.controller = null
        }
        // Polygons are owned by the physics world; destroy them all
        for (const poly of Object.values(this.polygons)) {
            poly.destroy()
        }
        window.removeEventListener("mousedown", this.onMouseDown)
        window.removeEventListener("mousemove", this.onGlobalMouseMove)
        window.removeEventListener("mouseup", this.onGlobalMouseUp)
        window.removeEventListener("keydown", this.onKeyDown)
    },
    methods: {

        // ── Catterpillar (unchanged logic) ──────────────────────────────────

        async start() {
            await this.storyStore.initialised
            if (window.location.search.includes("dev")) this.toggleDevMode()

            await this.storyStore.updateConditionalStories()
            console.info("=== 🦩 Starting passive stories ===")
            await this.storyStore.setActiveStory("wall-slam")
            await this.storyStore.setActiveStory("petting")
            await this.storyStore.setActiveStory("move-towards-mouse")
            await this.storyStore.setActiveStory("blocks")
            setTimeout(() => { console.info("================================\n") })
        },

        addCatterpillar() {
            if (this.controller?.catterpillar) {
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

        // ── LocalStorage persistence ─────────────────────────────────────────

        restorePolygons() {
            if (!this.controller) return
            const world = this.controller.ref.engine.world
            const draw = this.controller.draw

            const stored = loadStoredPolygons()
            for (const s of stored) {
                const poly = new Polygon({ id: s.id, points: s.points, color: s.color }, world)
                this.polygons[s.id] = poly
                draw.addPolygon(poly)
            }
        },

        persistPolygons() {
            savePolygons(this.polygons)
        },

        // ── Toolbar actions ───────────────────────────────────────────────────
        setMode(newMode: "none" | "draw" | "edit" | "play") {
            // ── Teardown current mode ─────────────────────────────────────────
            if (this.polygonMode === 'edit') {
                for (const id of Object.keys(this.polygons)) {
                    const drawObj = this.getDrawObject(id)
                    if (drawObj) drawObj.showAnchors = false
                }
            }
            if (this.polygonMode === 'draw') {
                this.cancelDraft()
            }
            if (this.polygonMode === 'play') {
                for (const id of Object.keys(this.polygons)) {
                    const drawObj = this.getDrawObject(id)
                    
                    if (drawObj?.two) {
                        drawObj.two.path.opacity = 1
                    }
                }
                this.toolbarVisible = true
            }

            // Toggle off if same mode
            if (this.polygonMode === newMode) {
                this.polygonMode = 'none'
                return
            }

            // ── Setup new mode ────────────────────────────────────────────────
            this.polygonMode = newMode

            if (newMode === 'edit') {
                for (const id of Object.keys(this.polygons)) {
                    const drawObj = this.getDrawObject(id)
                    if (drawObj) drawObj.showAnchors = true
                }
            }
            if (newMode === 'play') {
                for (const id of Object.keys(this.polygons)) {
                    const drawObj = this.getDrawObject(id)
                    
                    if (drawObj?.two) {
                        drawObj.two.path.opacity = 0
                    }
                }
                this.toolbarVisible = false
            }
        },
        
        cancelDraft() {
            this.draftPoints = []
            this.polygonMode = "none"
            this.removePreview()
        },

        deleteAllPolygons() {
            for (const poly of Object.values(this.polygons)) {
                poly.destroy()
            }
            this.polygons = {}
            this.polygonMode = "none"
            this.persistPolygons()
        },

        // ── Draw mode ─────────────────────────────────────────────────────────

        addDraftPoint(event: MouseEvent) {
            if (this.polygonMode !== "draw") return
            const pt = { x: event.clientX, y: event.clientY }

            // Snap-close near first point
            if (this.draftPoints.length >= 3) {
                const first = this.draftPoints[0]
                if (Math.hypot(pt.x - first.x, pt.y - first.y) < 18) {
                    this.confirmPolygon()
                    return
                }
            }
            this.draftPoints.push(pt)
            this.syncPreview()
        },

        updateCursor(event: MouseEvent) {
            this.cursor = { x: event.clientX, y: event.clientY }
            this.syncPreview()
        },

        // Keep the Draw-layer preview object in sync with draftPoints + cursor
        syncPreview() {
            if (!this.controller) return
            const draw = this.controller.draw

            if (this.draftPoints.length === 0 || !this.cursor) {
                this.removePreview()
                return
            }

            if (draw.previewObj) {
                // Update existing preview model in-place; drawPolygonPreview reads it each frame
                draw.previewObj.model = {
                    points: [...this.draftPoints],
                    mousePos: { ...this.cursor },
                    color: "#FF3B5C",
                }
            } else {
                draw.addPolygonPreview(this.draftPoints, this.cursor, "#FF3B5C")
            }
        },

        removePreview() {
            if (!this.controller) return
            const draw = this.controller.draw
            if (draw.previewObj) {
                // Setting model to undefined causes drawPolygonPreview to return false
                // which triggers #removePolygonPreview on the next frame
                draw.previewObj.model = undefined
            }
        },

        confirmPolygon() {
            if (this.draftPoints.length < 3 || !this.controller) return
            const world = this.controller.ref.engine.world
            const draw = this.controller.draw
            const id = `polygon-${Date.now()}`
            const poly = new Polygon({ id, points: [...this.draftPoints] }, world)
            this.polygons[id] = poly
            draw.addPolygon(poly)
            this.draftPoints = []
            this.polygonMode = "none"
            this.removePreview()
            this.persistPolygons()
        },

        // ── Edit mode ─────────────────────────────────────────────────────────

        startDragVertex(event: MouseEvent, index: number) {
            if (this.polygonMode !== "edit") return
            event.preventDefault()
            this.draggingVertexIndex = index
        },

        onMouseDown(event: MouseEvent) {
            if (this.polygonMode !== 'edit') return
            for (const [id, poly] of Object.entries(this.polygons)) {
                const index = poly.points.findIndex(
                    p => Math.hypot(p.x - event.clientX, p.y - event.clientY) < 12
                )
                if (index !== -1) {
                    event.preventDefault()
                    this.draggingPolygonId = id
                    this.draggingVertexIndex = index
                    return
                }
            }
        },

        onGlobalMouseMove(event: MouseEvent) {
            if (this.polygonMode === 'draw') {
                this.cursor = { x: event.clientX, y: event.clientY }
                this.syncPreview()
                return
            }
            if (this.polygonMode === 'edit' && this.draggingPolygonId !== null && this.draggingVertexIndex !== null) {
                const poly = this.polygons[this.draggingPolygonId]
                if (!poly) return
                const updated = poly.points.map((p, i) =>
                    i === this.draggingVertexIndex
                        ? { x: event.clientX, y: event.clientY }
                        : { ...p }
                )
                poly.updatePoints(updated)
            }
        },

        onGlobalMouseUp() {
            if (this.draggingVertexIndex !== null) {
                this.persistPolygons()
            }
            this.draggingPolygonId = null
            this.draggingVertexIndex = null
        },

        // ── Keyboard shortcuts ────────────────────────────────────────────────

        onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                if (this.polygonMode === "draw") this.cancelDraft()
            }
            
            if (e.key === "Enter" && this.polygonMode === "draw") this.confirmPolygon()
            if (e.key === 'd' && this.polygonMode === 'none') this.setMode('draw')
            if (e.key === 'e') this.setMode('edit')
            if (e.key === 'p') this.setMode('play')
            if ((e.key === "Delete" || e.key === "Backspace") && this.polygonMode !== "draw") this.deleteAllPolygons()
        },

        // ── Draw-layer helpers ────────────────────────────────────────────────

        // Retrieve the PolygonObjectModel from the Draw layer by polygon id
        getDrawObject(id: string | null) {
            if (!id || !this.controller) return null
            return this.controller.draw.objects.find(
                o => o.type === "polygon" && o.id === id
            ) as PolygonObjectModel | undefined ?? null
        },
    },
})
</script>

<style>
#matter-box-polygons {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1990;

    #matter {
        opacity: 0;
    }
}

#draw-overlay,
#edit-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: all;
    cursor: crosshair;
}

#edit-overlay {
    cursor: default;
}

/* ── Polygon toolbar ─────────────────────────────────────────────────────── */
#polygon-toolbar {
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    background: rgba(15, 15, 15, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 12px;
    backdrop-filter: blur(12px);
    transition: opacity 0.3s;

    &.hidden {
        opacity: 0;
    }
}

.tool-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.1s;
}
.tool-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.10);
    color: #fff;
}
.tool-btn:active:not(:disabled) { transform: scale(0.93); }
.tool-btn.active {
    background: rgba(255, 59, 92, 0.20);
    color: #FF3B5C;
}
.tool-btn.confirm { color: #34D399; }
.tool-btn.confirm:hover { background: rgba(52, 211, 153, 0.15); }
.tool-btn.danger { color: rgba(255, 255, 255, 0.4); }
.tool-btn.danger:hover:not(:disabled) {
    background: rgba(255, 59, 92, 0.15);
    color: #FF3B5C;
}
.tool-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.tool-divider {
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0 2px;
}
</style>