<template>
    <section class="product-page-template" v-if="!is404">
        <Breadcrumbs v-if="!isInIframe"/>

            <ProductPage :product="product" v-if="product"></ProductPage>
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
import IframeBlock from "@/components/layout/blocks/iframe.vue";
import SlateText, { SlateNode } from "@/components/slate-text.vue"

import useIdentityStore from "@/stores/identity"
import { type IdentityField } from "@/model/catterpillar/identity"
import { Piece, MediaImage } from "@/types/payload-stores"

import ProductPage from "@/components/layout/product-page-section.vue"


export default defineComponent ({ 
    name: "productPage",
    components: {
        Breadcrumbs,
        Layout,
        page404,
        FilterComponent,
        MatterBox,
        SlateText,
        ProductPage
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
        purchaseLink(){

            let link = "mailto:"
            link += "?subject=Enquiry: " + this.product.title

            let request = `I would like to purchase the ${this.product.title}`
            
            if (this.product.details) {
                this.product.details.forEach(detail => {
                    if (detail.name.toLowerCase().includes("limited")) {
                        // check if detail.value contains a number
                        const numberMatch = detail.value.match(/\d+/)
                        if (!!numberMatch) {
                            // check if title starts with a vowel
                            const firstLetter = this.product.title.charAt(0).toLowerCase()
                            if (["a", "e", "i", "o", "u"].includes(firstLetter)) {
                                request = `I would like to purchase an ${this.product.title}`
                            } else {
                                request = `I would like to purchase a ${this.product.title}`
                            }
                        }
                        console.log(detail.name.toLowerCase(), "Check number", !!numberMatch, request)
                    }
                })
            }

            const body = [
                "Hi Jeffrey,",
                "",
                request,
                `${ import.meta.env.VITE_CLIENT_URL + this.$route.fullPath}`,
                "",
                "Could you please let me know the next steps?",
                "",
                "Thanks!",
            ].join("\r\n")
            link += `&body=${encodeURIComponent(body)}`
            return link
        },
        price() {
            if (!this.product) {
                return "#ERROR"
            }
            const formatted = new Intl.NumberFormat("nl-NL", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(this.product.price)

            // €1.000,00 -> €1.000,-
            return formatted.replace(/\s/g, "").replace(",00", "")
        },
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
            pieceIframe: undefined as undefined | {
                blockType: `iframe`,
                id: `block-1234`,
                size: 12,
                title: string,
                url: string,
                showRefresh: true,
                autoScaling: `1`,
                portraitRatio: '3/4',
                landscapeRatio: '16/9'
                
            },
            product: {
                images: [] as MediaImage[],
                title: "",
                subTitle: "",
                price: 1990,
                details: [] as {[key: string]: string}[],
                description: undefined as SlateNode | undefined,
                pieceUrl: "",
                // variants: []
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
    },
    unmounted() {
        window.removeEventListener("addCatterpillar", this.updateIdentity)
    },
    methods: {
        changeImage(image: MediaImage) {
            this.selectedImage = image
        },
        generateImageUrl(image: MediaImage | null | undefined) {
            if (!image || !image.sizes) {
                return ""
            }
            return import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","") + image.sizes.image_sm.url
        },
        generateSourceSet(image: MediaImage) {
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
                    description: SlateNode | undefined,
                    images: Array<{id: string, image: MediaImage}>
                }


                this.product = {
                    images: [],
                    price: product.price,
                    details: product.details || [],
                    title: product.title,
                    subTitle: product.subtitle || "",
                    description: product.description ? product.description : undefined,
                    pieceUrl: product.piece?.path,
                    // variants?: product.variants || []
                }

                if (product.images) {
                    this.product.images = product.images?.map(img => img.image)
                    this.product.images = this.product.images.filter(img => img !== null && img !== undefined)
                    
                    this.selectedImage = this.product.images[0]
                }

                if (this.product.pieceUrl) {
                    this.pieceIframe = {
                        blockType: `iframe`,
                        id: `block-1234`,
                        size: 12,
                        title: this.product.title,
                        url: this.product.pieceUrl,
                        showRefresh: true,
                        autoScaling: `1`,
                        portraitRatio: '3/4',
                        landscapeRatio: '16/9'
                        
                    }
                }
                return false

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

<style lang="scss">
@use "@/assets/scss/variables.scss";



// .site-breadcrumbs {
//     margin-top: 40px;
//     margin-left: 8px;
// }

// .product-page-thumbnails-container {    
//     grid-column: span 2;
//     container-name: product-page-thumbnails;
//     container-type: inline-size;
// }

// .product-page-thumbnails {
//     display: grid;
//     gap: 8px;
//     margin: 0;
//     width: 100%;
//     grid-template-columns: repeat(2, 1fr);


//     img {
//         width: 100%;
//         opacity: .4;
//         transition: var(--transition-default);
//         filter: grayscale(1);
        
//         &:hover {
//             filter: grayscale(0.6);
//             opacity: 1;
//             cursor: pointer;
//         }

//         &.main-image {
//             grid-column: span 4;
//             grid-row: 1;
//             opacity: 1;
//             filter: grayscale(0);
//             translate: 0 0;
//             cursor: default;
//         }
        
//         &.__isSelected {
//             filter: grayscale(0);
//             opacity: 1;
//             translate: 0 0;
//         }
//     }
// }

// .product-page-content {
//     display: flex;
//     flex-flow: column-reverse;
//     grid-column: span 2;
//     // contain:size;
//     overflow-y: auto;

//     h1 {
//         margin: -6px 0 0;
//         position: absolute;
//         top: 80px;
//         flex: none; 
//     }

//     h2 {
//         margin: 4px 0 0;
//         font-size: 16px;
//         font-weight: 600;
//         opacity: .8;
//         position: absolute;
//         top: 108px;
//         flex: none; 
//     }
// }

// .product-page-details {
//     background-color: var(--bg-color);
//     padding: 16px;
//     margin-top: 16px;
//     overflow-y: auto;
//     display: flex;
//     flex-flow: column;
//     justify-content: space-between;
//     gap: 16px;
// }

// .product-page-purchase-section {
//     // padding-top: 32px;
//     display: flex;
//     justify-content: space-between;
//     width: 100%;
//     flex: none; 
// }

// .product-page-price {
//     font-family: var(--accent-font);
//     font-size: 40px;
//     display: flex;
//     align-items: center;
//     padding-left: 16px;
// }

// .product-page-button-container {
//     font-family: var(--accent-font);
//     font-size: 24px;

//     a {
//         display: flex;
//         justify-content: center;
//         align-items: center;
//         text-decoration: none;
//         height: 100%;
//         font-size: 16px;
//     }
// }


// .product-page {
//     display: grid;
//     grid-template-columns: 1fr 128px;
//     gap: 16px 40px;
//     padding: 16px;
//     margin: auto;
//     max-width: 144vh;

//     container-name: product-page;
//     container-type: inline-size;
    
//     .iframe-block {
//         grid-column: span 2;
//         padding-top: 8px;
//     }
// }

// .product-page-table-row {
//     display: flex;
//     justify-content: space-between;
//     padding: 6px 0;
//     border-bottom: 1px solid rgba(0,0,0,.072);
//     font-size: 16px;

//     &:last-child {
//         border-bottom: none;
//     }
// }

// .product-page-table-key {
//     font-weight: 600;
//     font-family: var(--accent-font);    
// }
// .product-page-table-value {
//     font-size: 14px;
// }

// @media screen and (min-width: 640px) {
//     .site-breadcrumbs {
//         margin-left: 16px;
//         margin-top: 60px;
//     }

//     .product-page-thumbnails-container {
//         gap: 16px;
//         // grid-column: span 1;
//     }
// }

// @media screen and (min-width: 800px) {

//     .product-page {
//         grid-template-columns: 1fr 1fr;
//     }
//     .site-breadcrumbs {
//         margin-top: 80px;
//     }
// }

// .product-page-image {
//     grid-column: span 2;
//     padding-top: 64px;

//     img {
//         width: 100%;
//     }
// }

// .product-description {
//     font-size: 14px; 
//     max-height: 100%;
//     overflow: auto;

//     p {
//         margin: 0;
//     }
// }

// //////////////////////////////////////////////////////
// // PRODUCT PAGE CONTAINER QUERIES
// //////////////////////////////////////////////////////
// // 600px
// @container product-page (min-width: 600px) {
//     .product-page-content {
//         flex-flow: column;
        
//         h1, h2 {
//             position: static;    
//         }
//     }

//     .product-page-button-container {
//         a {
//             font-size: 24px;
//         }
//     }
    
//     .product-page-image {
//         grid-column: span 1;
//     }
    
//     .product-page-image {
//         padding-top: 0;
//     }
    
//     .product-page-purchase-section {
//         padding-top: 32px;
//     }
    
//     .product-page-thumbnails-container {
//         grid-column: span 1;
//     }
// }

// // PRODUCT PAGE CONTAINER QUERY
// // 800px

// @container product-page (min-width: 800px) {
//     .product-page {
//         grid-template-columns: 1fr 1fr;
//     }

//     .product-page-content {
//         grid-column: 2/3;
//         grid-row: 1;
//     }
//     .product-page-details {
//         flex: 1 1 0; 
//         min-height: 0;  
//     }

// }


// @container product-page-thumbnails (min-width: 129px) {
//     .product-page-thumbnails {
//         grid-template-columns: repeat(4, 1fr);
//     }
// }
// @container product-page-thumbnails (min-width: 320px) {
//     .product-page-thumbnails {
//         grid-template-columns: repeat(6, 1fr);
//         img {
//             &.main-image {
//                 grid-column: span 6;
//             }
//         }
//     }
// }
// @container product-page-thumbnails (min-width: 480px) {
//     .product-page-thumbnails {
//         grid-template-columns: repeat(8, 1fr);
        
//         img {
//             &.main-image {
//                 grid-column: span 8;
//             }
//         }
//     }
// }
</style>