<template>
    <section class="wurmpje-template layout __isLoaded" @click="updatePolygons" @mousedown="drawLine">
        <PolygonDrawer />
    </section>

</template>


<script lang="ts">
import { defineComponent } from "vue"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import PolygonDrawer from "@/components/polygon-drawer.vue";    

import payloadStore from "@/stores/payload"
import { useHead }  from "@unhead/vue"
import { useRoute, RouteLocationNormalizedLoaded } from "vue-router"
import Breadcrumbs from "@/components/breadcrumbs.vue"
import FilterComponent from "@/components/filter.vue"
import Layout from "@/components/layout/index.vue"
import page404 from "@/routes/error-404.vue"
import { BlockType } from "@/components/layout/layout-types"

const setMeta = (route: RouteLocationNormalizedLoaded) => {
    const meta = [] as Array<{
        name: string,
        content: string
    }>

    if (typeof route.meta?.description === "string" && route.meta.description.length > 0) {
        meta.push({
            name: "description",
            content: route.meta.description
        })
    }

    if (typeof route.meta?.keywords === "string" && route.meta.keywords.length > 0) {
        meta.push({
            name: "keywords",
            content: route.meta.keywords
        })
    }
    return meta
} 

export default defineComponent ({ 
    name: "defaultTemplate",
    components: {
        Breadcrumbs,
        Layout,
        page404,
        FilterComponent,
        PolygonDrawer
    },
    props: [],
    setup() {
        const Payload = payloadStore()
        const route = useRoute()
        const title = route.name as string

       
        return {
            Payload,
            head:  useHead({
                title,
                meta: setMeta(route)
            }) 
        }
    },
    data() {
        return {
            startMousePos: { x: 0, y: 0},
            polygons: [
                { points: [{ x: 100, y: 100}, { x: 200, y: 100}, { x: 150, y: 200}] },
                { points: [{ x: 300, y: 300}, { x: 400, y: 300}, { x: 350, y: 400}] }
             ] as Array<{
                points: Array<{ x: number, y: number }>
             }>
        }
    },
    watch: {
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
        gsap.registerPlugin(ScrollToPlugin);

        const siteHeader = document.querySelector(".site-header")
        document.body.style.background = "#000";
        if (siteHeader) {
            siteHeader.remove()
        }
        // window.addEventListener("resize", this.updateLayoutSize)
    },
    unmounted() {
        // window.removeEventListener("resize", this.updateLayoutSize)
    },
    methods: {
        updatePolygons(e: MouseEvent) {
            const mousePos = { x: e.clientX, y: e.clientY }
            this.startMousePos = mousePos
        },
        drawLine(e: MouseEvent) {
            const mousePos = { x: e.clientX, y: e.clientY }
            console.log(mousePos)
        }
    }
})

</script>

<style lang="scss" scoped>
@use "@/assets/scss/variables.scss";


</style>