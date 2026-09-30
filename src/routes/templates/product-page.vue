<template>
    <section class="product-page-template" v-if="!is404">
        <Breadcrumbs v-if="!isInIframe"/>

        <figure class="product-page-thumbnails">
            <img v-if="selectedImage"
                :src="generateImageUrl(selectedImage)"
                :srcset="generateSourceSet(selectedImage)"
                class="main-image"
                >
            <img 
                :src="generateImageUrl(media)"
                :srcset="generateSourceSet(media)"
                @click="selectedImage = media"
                :test="selectedImage?.id + '==' + media.id"
                :class="selectedImage?.id == media.id ? '__isSelected' : ''"
                v-if="product.images.length > 0" v-for="(media, index) in product.images"
                :key="index">
            <!-- <pre>{{ product }}</pre> -->
        </figure>
    </section>
    <MatterBox v-if="identity && !isInIframe" :identity="identity"></MatterBox>
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

import useIdentityStore from "@/stores/identity"
import { type IdentityField } from "@/model/catterpillar/identity"
import { Piece, MediaImage } from "@/types/payload-stores"


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
            selectedImage: undefined as undefined | MediaImage,
            product: {
                images: [] as MediaImage[],
                title: "",
                subTitle: "",
                price: 1990,
                details: [] as {[key: string]: string}[],
                description: "",
                pieceUrl: "",
                variants: []
            },
            is404: false,
            pageLoaded: false,
            pageSwitchIndex: 0,
            meta: [] as Array<{ name: string, content: string }>,
            abortController: null as AbortController | null,
            fadeOutTimeout: undefined as undefined | ReturnType<typeof setTimeout>,
            pageIsLoading: null as ReturnType<typeof setTimeout> | null,
            pageData: undefined as PageType | undefined,
            identity: undefined as IdentityField | undefined,
            isInIframe: window.self !== window.top
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
        generateImageUrl(image: MediaImage) {
            if (!image || !image.sizes) {
                return ""
            }
            return import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","") + image.sizes.image_sm.url
        },
        generateSourceSet(image: MediaImage) {
            console.log(image)
            if (!image || !image.sizes) {
                return ""
            }
            let sourceSet = ""
            let src = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","")

            
            sourceSet += `${src}/${image.sizes.image_sm.url} ${image.sizes.image_sm.width}w,\r\n`
            sourceSet += `${src}/${image.sizes.image_md.url} ${image.sizes.image_md.width}w,\r\n`
            sourceSet += `${src}/${image.sizes.image_lg.url} ${image.sizes.image_lg.width}w\r\n`
            return sourceSet
        },
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
                console.log("Loaded page: ",this.$route.path, res)
                if (!res) {
                    this.is404 = true
                    return true
                }
                const product = res as unknown as {
                    price: number,
                    details: Array<{[key: string]: string}>,
                    title: string
                    subtitle: string
                    piece: Piece,
                    images: Array<{id: string, image: MediaImage}>
                }


                this.product = {
                    images: [],
                    price: product.price,
                    details: product.details || [],
                    title: product.title,
                    subTitle: product.subtitle || "",
                    pieceUrl: product.piece?.path,
                }

                if (product.images) {
                    this.product.images = product.images?.map(img => img.image)
                    this.selectedImage = this.product.images[0]
                }
                return

            } catch (error) {
                console.error("Error loading page:", error)
                this.is404 = true
            }
            return true
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

.product-page-thumbnails {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(8, 1fr);

    img {
        width: 100%;
        opacity: .8;
        transition: var(--transition-default);
        filter: grayscale(1);
        
        &:hover {
            translate: 0 -4px;
            filter: grayscale(0.2);
            opacity: 1;
            cursor: pointer;
        }

        &.main-image {
            grid-column: 1 / 9;
            grid-row: 1;
            opacity: 1;
            filter: grayscale(0);
            translate: 0 0;
            cursor: default;
        }
        
        &.__isSelected {
            filter: grayscale(0);
            opacity: 1;
            translate: 0 0;
        }
    }
}

@media screen and (min-width: 640px) {
    .site-breadcrumbs {
        margin-left: 16px;
        margin-top: 60px;
    }

    .product-page-thumbnails {
        gap: 16px;
    }
}

@media screen and (min-width: 800px) {
    .site-breadcrumbs {
        margin-top: 80px;
    }
}
</style>