<template>
    <section class="default-template" v-if="!is404">
        <Breadcrumbs />

        <Layout v-if="pageData?.layout" id="default-layout" ref="default-layout" :options="{
            layoutGap: 40,
            id: pageData.id,
            layoutSize: layoutSize,
            blocks: pageData.blocks
        }" @loaded="loaded"/>
        <FilterComponent v-if="pageData?.filter?.name && showFilters" :options="pageData?.filter" :pageDetails="pageData" ref="filter" @filterUpdated="updateFilter"/>
    </section>

    <page404 v-if="is404"/>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {PageType} from "@/model/payload/page"

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
        FilterComponent
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
            // pageBlocks: [] as Array<BlockType>,
            // tempPageBlocks: [] as Array<BlockType>,
            abortController: null as AbortController | null,
            fadeOutTimeout: undefined as undefined | NodeJS.Timeout,
            pageIsLoading: null as NodeJS.Timeout | null,
            pageData: undefined as PageType | undefined
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

                // if (blokElements.length == 0) {
                //     true
                // } 
                    
                // Scroll to top
                gsap.to(window, {
                    scrollTo: { y: 0 }, // Scroll to the top of the page
                    duration: .8,      // Duration of the animation in seconds
                    ease: "sine.out"  // Use the bounce easing for the effect
                });

                if (this.head) {
                    this.head.patch({
                        title: this.$route.name,
                        meta: setMeta(this.$route)
                    })
                }
            }, 
            immediate: true
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
        gsap.registerPlugin(ScrollToPlugin);

        window.addEventListener("resize", this.updateLayoutSize)
    },
    unmounted() {
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
                // const blokElements = document.querySelectorAll("#default-layout .block")
                // setTimeout(() => {
                //     if (blokElements.length > 0) {
                //         for (let index = 0; index < blokElements.length; index++) {
                //             const element = blokElements[index];

                //             gsap.fromTo(element, { opacity: 0 },{
                //                 opacity: 1,
                //                 duration: .24,
                //                 delay: .1 + index * .1,
                //                 ease: "sine.out",
                //                 onComplete: () => {
                //                     // Check if a #filter-layout exists in the current url, using this.$route.hash
                //                     if (this.$route.hash === "#filter-layout") {
                //                         const filterLayout = document.getElementById("filter-layout")
                //                         if (filterLayout) {
                //                             filterLayout.scrollIntoView({ behavior: "smooth" })
                //                         }
                //                     }
                //                 }
                //             })
                //         }
                //     }
                // }, blokElements.length * 1)
            })
        },
        fadeOutPage() {
            const blokElements = Array.from(document.querySelectorAll("#default-layout .block")).sort((a, b) => (a as HTMLElement).offsetTop - (b as HTMLElement).offsetTop);
            // for (let index = 0; index < blokElements.length; index++) {
            //     const element = blokElements[index] as HTMLElement;
            //     let onCompleteAdded = false
            // }
            
            
            const viewportHeight = window.innerHeight;
    
            blokElements.forEach((el, index) => {
                const element = el as HTMLElement
                if ((element.offsetTop > viewportHeight || index === blokElements.length - 1)  && !this.fadeOutTimeout) {
                    this.fadeOutTimeout = setTimeout(() => {
                        this.fadeOutTimeout = undefined
                    }, Math.min(index * 250, 1000)) // Limit timeout to 1 second
                }
            })
            
            gsap.to("#default-layout .block", {
                opacity: 0,
                duration: .24,
                stagger: 0.1,
                ease: "sine.out"
            })
        },
        // cancelPageLoad() {
        //     if (this.pageIsLoading) {
        //         clearTimeout(this.pageIsLoading)
        //     }
        //     // this.tempPageBlocks = []
        //     this.pageBlocks = []
        //     if (this.Payload.page) {
        //         this.Payload.page.data.blocks = []
        //     }

        //     // Clear Layout blocks cache
        //     if (this.$refs["default-layout"]) {
        //         const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
        //         // defaultLayout.blocks = []
        //     }
        // },
        async loadPage() {
            try {
                this.pageSwitchIndex++
                // this.cancelPageLoad()
                const res = await this.Payload.getPageByPath(this.$route.path)
                
                // this.Payload.page?.data = res as PageType
                if (!res) {
                    this.is404 = true
                    return true
                }
                // this.tempPageBlocks = res.blocks
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

            // Cancel the fadeout and reset the blocks && newBlocks of the default-layout 
            // if (this.fadeOutTimeout) {
            //     clearTimeout(this.fadeOutTimeout)
            //     this.pageFadedOut = true
                        
            //     if (this.$refs["default-layout"]) {
            //         const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
            //         defaultLayout.blocks = []
            //         defaultLayout.newBlocks = []
            //     }
            // }
                        // if (this.$refs["default-layout"]) {
                        //     const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
                        //     defaultLayout.blocks = []
                        //     defaultLayout.newBlocks = []
                        // }
                        // console.log("Page faded out", this.Payload.page)
                        // if (this.Payload.page?.data) {
                        //     this.pageBlocks = this.Payload.page.data.blocks
                        // }

            if (this.Payload.page) {
                this.updateLayoutSize()
                
                // Remove old content
                if (this.$refs["default-layout"]) {
                    const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
                    defaultLayout.newBlocks = []
                    defaultLayout.blocks = []
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
        updateFilter() {
            // Doe dingen ?
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