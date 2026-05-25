<template>
    <MatterBoxPolygons v-if="identity" :identity="identity"></MatterBoxPolygons>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import payloadStore from "@/stores/payload"
import { useHead }  from "@unhead/vue"
import { useRoute, RouteLocationNormalizedLoaded } from "vue-router"
import Breadcrumbs from "@/components/breadcrumbs.vue"
import FilterComponent from "@/components/filter.vue"
import Layout from "@/components/layout/index.vue"
import page404 from "@/routes/error-404.vue"

import useIdentityStore from "@/stores/identity"
import { type IdentityField } from "@/model/catterpillar/identity"
import MatterBoxPolygons from "@/components/matter-box-polygons.vue";


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
        MatterBoxPolygons
    },
    props: [],
    setup() {
        const Payload = payloadStore()
        const route = useRoute()
        const identityStore = useIdentityStore()
        const title = route.name as string

       
        return {
            Payload,
            identityStore,
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
             }>,
            identity: undefined as IdentityField | undefined
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
        window.addEventListener("addCatterpillar", this.updateIdentity)
        // window.addEventListener("resize", this.updateLayoutSize)
    },
    unmounted() {
        window.removeEventListener("addCatterpillar", this.updateIdentity)
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
        },
        updateIdentity() {
            
            if (this.Payload.auth && this.Payload.auth.self) {
                const catterpillar = this.Payload.auth.self.catterpillar
                if (!catterpillar) return 
                            
                this.identity = {
                    id: this.Payload.auth.self.id,
                    name: this.Payload.auth.self.username,
                    textureIndex: catterpillar.textureIndex, // 0-1023 | this.Payload.auth.self.catterpillar.textureIndex
                    colorSchemeIndex: catterpillar.colorSchemeIndex, // 0-1023 | this.Payload.auth.self.catterpillar.colorSchemeIndex
                    offset: catterpillar.offset, // 0-15 | this.Payload.auth.self.catterpillar.offset  
                    gender: Math.floor(Math.random() * 2), 
                    length: catterpillar.length,             // 0-31
                    thickness: catterpillar.thickness          // 0-63
                }

                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("layoutChange", { detail: this.identity }))
                }, 100)
            }
        }
    }
})

</script>

<style lang="scss" scoped>
@use "@/assets/scss/variables.scss";


</style>