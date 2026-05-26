<template>
    <section class="default-template" v-if="!is404">
        <Breadcrumbs />

        <Layout v-if="pageData?.layout" id="default-layout" ref="default-layout" :options="{
            layoutGap: 40,
            id: pageData.id,
            layoutSize: layoutSize,
            blocks: pageData.blocks
        }" @loaded="loaded"/>
        <FilterComponent v-if="pageData?.filter?.name && showFilters" :options="pageData?.filter" :pageDetails="pageData" ref="filter" />
    </section>
    <MatterBox v-if="identity" :identity="identity"></MatterBox>
    <page404 v-if="is404"/>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {PageType} from "@/model/payload/page"
import MatterBox from "@/components/matter-box.vue";

import payloadStore from "@/stores/payload"
import { useHead }  from "@unhead/vue"
import { useRoute, RouteLocationNormalizedLoaded } from "vue-router"
import Breadcrumbs from "@/components/breadcrumbs.vue"
import FilterComponent from "@/components/filter.vue"
import Layout from "@/components/layout/index.vue"
import page404 from "@/routes/error-404.vue"
import { BlockType } from "@/components/layout/layout-types"

import useIdentityStore from "@/stores/identity"
import { type IdentityField } from "@/model/catterpillar/identity"

// const setMeta = (route: RouteLocationNormalizedLoaded) => {
//     const meta = [] as Array<{
//         name: string,
//         content: string
//     }>

//     if (typeof route.meta?.description === "string" && route.meta.description.length > 0) {
//         meta.push({
//             name: "description",
//             content: route.meta.description
//         })
//     }

//     if (typeof route.meta?.keywords === "string" && route.meta.keywords.length > 0) {
//         meta.push({
//             name: "keywords",
//             content: route.meta.keywords
//         })
//     }
//     return meta
// } 

export default defineComponent ({ 
    name: "defaultTemplate",
    components: {
        Breadcrumbs,
        Layout,
        page404,
        FilterComponent,
        MatterBox
    },
    props: [],
    setup() {
        const Payload = payloadStore()
        const route = useRoute()
        const identityStore = useIdentityStore()
        let title = route.name as string
       
        if (Payload.page?.data?.pageTitle) {
            title = Payload.page.data.pageTitle
        }

        return{
            Payload,
            identityStore,
            head:  useHead({
                title,
                link: [
                    { rel: 'canonical', href: route.fullPath }
                ],
                meta: []
            }) 
        } as {
            Payload: ReturnType<typeof payloadStore>,
            identityStore: ReturnType<typeof useIdentityStore>,
            head: ReturnType<typeof useHead>
        }

    },
    computed: {
        showFilters() {
            if (this.pageData?.filter && typeof this.pageData.displayFilters === "boolean") {
                return this.pageData.displayFilters
            } else {
                return true
            }
        },
    },
    data() {
        return {
            breakpoint: "",
            layoutSize: 8,
            is404: false,
            pageLoaded: false,
            pageSwitchIndex: 0,
            meta: [] as Array<{ name: string, content: string }>,
            abortController: null as AbortController | null,
            fadeOutTimeout: undefined as undefined | ReturnType<typeof setTimeout>,
            pageIsLoading: null as ReturnType<typeof setTimeout> | null,
            pageData: undefined as PageType | undefined,
            identity: undefined as IdentityField | undefined
        }
    },
    watch: {
        "$route.path": {
            async handler() {
                this.pageLoaded = false
                this.is404 = false
                
                const blokElements = Array.from(document.querySelectorAll("#default-layout .block")) //.sort((a, b) => (a as HTMLElement).offsetTop - (b as HTMLElement).offsetTop);
                if (blokElements.length > 0) {
                    this.fadeOutPage()
                } 

                this.pageLoaded = await this.loadPage()

                    
                // Scroll to top
                gsap.to(window, {
                    scrollTo: { y: 0 }, // Scroll to the top of the page
                    duration: .8,      // Duration of the animation in seconds
                    ease: "sine.out"  // Use the bounce easing for the effect
                });
                
                if (!this.Payload.page?.data) return

                const newHead = {
                    meta: this.meta,
                    link: [ { rel: 'canonical', href: this.$route.fullPath } ]
                } as {
                    title?: string,
                    meta?: Array<{
                        name: string,
                        content: string
                    }>,
                    link: Array<{ rel: string, href: string }>
                }

                if (this.Payload.page.data.title) {
                    newHead.title = this.Payload.page.data.title
                }

                if (this.Payload.page.data.pageTitle) {
                    newHead.title = this.Payload.page.data.pageTitle
                }

                if (this.Payload.page.data.metaDescription) {
                    this.meta.push({
                        name: "description",
                        content: this.Payload.page.data.metaDescription
                    })
                } 

                if (this.Payload.page.data.metaTags) {
                    this.meta.push({
                        name: "keywords",
                        content: this.Payload.page.data.metaTags.join(", ")
                    })
                }

                this.head.patch(newHead)
                
            }, 
            immediate: true
        },
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
        gsap.registerPlugin(ScrollToPlugin);

        window.addEventListener("addCatterpillar", this.updateIdentity)
        window.addEventListener("resize", this.updateLayoutSize)
    },
    unmounted() {
        window.removeEventListener("addCatterpillar", this.updateIdentity)
        window.removeEventListener("resize", this.updateLayoutSize)
    },
    methods: {
        loaded() {
            this.$nextTick(() => {
                if (this.$route.hash === "#filter-layout") {
                    const filterLayout = document.getElementById("filter-layout")
                    if (filterLayout) {
                        filterLayout.scrollIntoView({ behavior: "smooth" })
                    }
                }
            })
        },
        fadeOutPage() {
            const blokElements = Array.from(document.querySelectorAll("#default-layout .block")).sort((a, b) => (a as HTMLElement).offsetTop - (b as HTMLElement).offsetTop);
            
            const viewportHeight = window.innerHeight;
    
            blokElements.forEach((el, index) => {
                const element = el as HTMLElement
                const rect = element.getBoundingClientRect();
                const offsetTop = rect.top;
                if ((offsetTop > viewportHeight || index === blokElements.length - 1)  && !this.fadeOutTimeout) {
                    this.fadeOutTimeout = setTimeout(() => {
                        this.fadeOutTimeout = undefined
                    }, index * 250)
                }
            })
            
            gsap.to("#default-layout .block", {
                opacity: 0,
                duration: .24,
                stagger: 0.1,
                ease: "sine.out"
            })
        },
        async loadPage() {
            try {
                this.pageSwitchIndex++

                if (this.$refs["default-layout"]) {
                    const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
                    defaultLayout.processing = true
                }
                const res = await this.Payload.getPageByPath(this.$route.path)
                
                if (!res) {
                    this.is404 = true
                    return true
                }

                this.updatePageBlocks(this.pageSwitchIndex)
            } catch (error) {
                console.error("Error loading page:", error)
                this.is404 = true
            }
            return true
        },
        updatePageBlocks(index: number) {
            if (index !== this.pageSwitchIndex) {
                return
            }

            if (!this.pageLoaded || this.fadeOutTimeout || !this.Payload.page?.data) {
                // Repeat this function until pageLoaded is true
                this.pageIsLoading = setTimeout(() => {
                    this.updatePageBlocks(index)
                }, 50)
                return
            }

            if (this.Payload.page) {
                this.updateLayoutSize()
                
                // Remove old content
                if (this.$refs["default-layout"]) {
                    const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
                    defaultLayout.newBlocks = []
                    defaultLayout.blocks = []
                    defaultLayout.processing = false
                }
                
                // Add new content
                if (this.Payload.page.data) {
                    this.pageData = this.Payload.page.data
                }
                this.updateLayoutSize()
            }
        },
        updateLayoutSize() {
            if (!this.pageData?.layout) {
                return
            }
            // Match these with Payload::pages.fields.layout for best DX
            const breakPoints = {
                xs: 320,
                s: 640,
                m: 960,
                l: 1280,
                xl: 1600,
            }
            
            let breakPoint: keyof typeof breakPoints = "xs"
            for (const point in breakPoints) {
                breakPoint = point as keyof typeof breakPoints
                
                if (typeof breakPoints[breakPoint] === "number" && breakPoints[breakPoint] > window.innerWidth) {
                    break
                }
            }
            this.breakpoint = breakPoint
            const size = `size_${this.breakpoint}` as "size_xs" | "size_s" | "size_m" | "size_l" | "size_xl" 
            this.layoutSize = this.pageData.layout[size]
        },
        updateIdentity() {
            console.log("Updating identity in default template", this.Payload.auth?.self?.catterpillar)
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
            }
        }
    }
})

</script>

<style lang="scss" scoped>
@use "@/assets/scss/variables.scss";



.site-breadcrumbs {
    margin-top: 40px;
    margin-left: 8px;
}
    
@media screen and (min-width: 640px) {
    .site-breadcrumbs {
        margin-left: 16px;
        margin-top: 60px;
    }
}

@media screen and (min-width: 800px) {
    .site-breadcrumbs {
        margin-top: 80px;
    }
}
</style>