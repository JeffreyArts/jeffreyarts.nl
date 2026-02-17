<template>
    <section class="default-template" v-if="!is404">
        <Breadcrumbs />

        <Layout v-if="Payload?.page?.data?.layout" id="default-layout" ref="default-layout" :options="{
            layoutGap: 40,
            id: 'favorites',
            layoutSize: layoutSize,
            blocks: pageBlocks
        }" @loaded="loaded"/>
    </section>

    <page404 v-if="is404"/>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import gsap from "gsap"
import Packer from "@/model/packer"
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import payloadStore from "@/stores/payload"
import { useHead }  from "@unhead/vue"
import { useRoute, RouteLocationNormalizedLoaded } from "vue-router"
import Breadcrumbs from "@/components/breadcrumbs.vue"
import FilterComponent from "@/components/filter.vue"
import Layout from "@/components/layout/index.vue"
import page404 from "@/routes/error-404.vue"
import {PieceThumbnailBlock} from "@/components/layout/blocks/piece-thumbnail.vue"
import {ProjectThumbnailBlock} from "@/components/layout/blocks/project-thumbnail.vue"
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
            if (this.Payload?.page?.data?.filter && typeof this.Payload.page.data.displayFilters === "boolean") {
                return this.Payload.page.data.displayFilters
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
            fadeOutCompleted: false,
            pageIsLoading: 0,
            pageBlocks: [] as Array<BlockType>,
            tempPageBlocks: [] as Array<BlockType>,
            abortController: null as AbortController | null
        }
    },
    watch: {
        "$route.path": {
            async handler() {
                this.fadeOutCompleted = false
                this.loadPage()

                const blokElements = Array.from(document.querySelectorAll("#default-layout .block"))
                    .sort((a, b) => (a as HTMLElement).offsetTop - (b as HTMLElement).offsetTop);
                if (blokElements.length > 0) {
                    for (let index = 0; index < blokElements.length; index++) {
                        const element = blokElements[index] as HTMLElement;
                        const viewportHeight = window.innerHeight;
                        let onCompleteAdded = false

                        gsap.to(element, {
                            opacity: 0,
                            duration: .24,
                            delay: index * .1,
                            ease: "sine.out",
                            onComplete: () => {
                                if ((element.offsetTop > viewportHeight || index === blokElements.length - 1)  && !onCompleteAdded) {
                                    setTimeout(() => {
                                        this.fadeOutCompleted = true
                                        onCompleteAdded = true
                                    }, 240)
                                }
                            }
                        })
                    }
                } else {
                    this.fadeOutCompleted = true
                }

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
                const blokElements = document.querySelectorAll("#default-layout .block")
                setTimeout(() => {
                    if (blokElements.length > 0) {
                        for (let index = 0; index < blokElements.length; index++) {
                            const element = blokElements[index];

                            gsap.fromTo(element, { opacity: 0 },{
                                opacity: 1,
                                duration: .24,
                                delay: .1 + index * .1,
                                ease: "sine.out"
                            })
                        }
                    }
                }, blokElements.length * 1)
            })
        },
        async loadPage() {
            try {
                this.pageIsLoading++
                const page = await this.Payload.getPageByPath(this.$route.path)
                const userId = this.Payload.auth?.self?.id
                if (!userId) {
                    return
                }
                
                const favorites = await this.Payload.GET("favorites?where[user][equals]=" + userId)

                if (!page) {
                    return
                }
                let index =  page.blocks.length +1

                // convert favorites.docs to blocks
                const blocks = favorites.data.docs.map((fav: any) => {
                    let favBlock = {
                        size: 2,
                        id: fav.id,
                    } as BlockType
                    
                    if (fav.piece_id !== null) {
                        // favBlock.blockType = 
                        favBlock.data = {
                            blockType: "pieceThumbnail",
                            piece: fav.piece_id
                        }
                    } else if (fav.project_id !== null) {
                        favBlock.data = {
                            blockType: "projectThumbnail",
                            link: fav.project_id.path,
                            categories: fav.project_id.categories,
                            title: fav.project_id.title,
                            image: fav.project_id.thumbnail
                        }
                    }

                    index++
                    return favBlock
                })

                if (this.Payload.page?.data) {
                    this.Payload.page.data.blocks = [...page.blocks, ...blocks]
                }
                
                this.tempPageBlocks = [...page.blocks, ...blocks]
                this.updateLayoutSize()
                this.updatePageBlocks(this.pageIsLoading)
            } catch (error) {
                console.error("Error loading page:", error)
                this.is404 = true
            }
        },
        updatePageBlocks(index: number) {
            if (index !== this.pageIsLoading) {
                return
            }
            if (!this.fadeOutCompleted) {
                // Repeat this function until fadeOutCompleted is true
                setTimeout(() => {
                    this.updatePageBlocks(index)
                }, 50)
                return
            }

            if (this.Payload.page) {
                // Add new content
                this.updateLayoutSize()

                if (this.$refs["default-layout"]) {
                    const defaultLayout = this.$refs["default-layout"] as InstanceType<typeof Layout>
                    defaultLayout.blocks = []
                    defaultLayout.packerLayout = new Packer(defaultLayout.layoutWidth, 0, { autoResize: "height" })
                }

                if (this.Payload.page.data) {
                    this.pageBlocks = this.Payload.page.data.blocks
                    this.tempPageBlocks = []
                }
            }
        },
        updateLayoutSize() {
            if (!this.Payload.page?.data?.layout) {
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
            this.layoutSize = this.Payload.page?.data.layout[size]
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