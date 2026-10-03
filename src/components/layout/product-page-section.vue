<template>
     <div class="product-page">
            <div class="product-page-image">
                <img v-if="selectedImage"
                    :src="generateImageUrl(selectedImage)"
                    :srcset="generateSourceSet(selectedImage)"
                    @load="imageLoaded"
                    :class="['main-image', product.subTitle ? '__hasSubtitle' : '']"
                    >
            </div>
            <div class="product-page-thumbnails-container">
                <figure class="product-page-thumbnails">
                    <img 
                        :src="generateImageUrl(media)"
                        :srcset="generateSourceSet(media)"
                        @click="changeImage(media)"
                        :class="selectedImage?.id == media.id ? '__isSelected' : ''"
                        v-if="product.images.length >= 0" v-for="(media, index) in product.images"
                        :key="index">
                </figure>
            </div>

            <div class="product-page-content">
                <h1>{{ product.title }}</h1>
                <h2 v-if="product.subTitle">{{ product.subTitle }}</h2>
                
                <div class="product-page-details">
                    <div class="product-description">
                        <SlateText v-if="product.description" :data="product.description" />
                    </div>

                    <div class="product-page-table" v-if="product.details && product.details.length > 0">
                        <div class="product-page-table-row" v-for="(detail, index) in product.details" :key="index">
                            <div class="product-page-table-key">{{ detail.name}}</div>
                            <div class="product-page-table-value">{{ detail.value }}</div>
                        </div>
                    </div>
                </div>

                <div class="product-page-purchase-section">
                    <div class="product-page-price">
                        {{ price }}
                    </div>
                    <div class="product-page-button-container">
                        <a :href="purchaseLink" class="button">Enquire</a>
                    </div>
                </div>
            </div>
            
            <iframeBlock v-if="pieceIframe" :options="pieceIframe" />
            
        </div>
</template>

<script lang="ts">

import { defineComponent, PropType } from "vue"

import gsap from "gsap"
import payloadStore from "@/stores/payload"
import { useHead }  from "@unhead/vue"
import { useRoute } from "vue-router"
import iframeBlock, { IframeBlock } from "@/components/layout/blocks/iframe.vue";
import SlateText, { SlateNode } from "@/components/slate-text.vue"

import useIdentityStore from "@/stores/identity"
import { MediaImage } from "@/types/payload-stores"

type productPage = {
    title: string,
    subTitle?: string
    price: number
    details: {[key: string]: string}[]
    description?: SlateNode
    images: MediaImage[],
    pieceUrl?: string
}

export default defineComponent ({ 
    name: "productPageSection",
    components: {
        SlateText,
        iframeBlock
    },
    props: {
        product: {
            type: Object as PropType<productPage>,
            required: true
        }
    },
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
            if (!this.product) {
                return
            }

            let link = "mailto:"
            link += "?subject=Enquiry: " + this.product.title

            let request = `I would like to purchase the ${this.product.title}`
            
            if (this.product.details) {
                const product = this.product
                this.product.details.forEach(detail => {
                    if (detail.name.toLowerCase().includes("limited")) {
                        // check if detail.value contains a number
                        const numberMatch = detail.value.match(/\d+/)
                        if (!!numberMatch) {
                            // check if title starts with a vowel
                            const firstLetter = product.title.charAt(0).toLowerCase()
                            if (["a", "e", "i", "o", "u"].includes(firstLetter)) {
                                request = `I would like to purchase an ${product.title}`
                            } else {
                                request = `I would like to purchase a ${product.title}`
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
                return 
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
        pieceIframe() {
            if (!this.product || !this.product.pieceUrl) {
                return
            }

            const iframeObject = {
                blockType: `iframe`,
                id: `block-1234`,
                size: 12,
                title: this.product.title,
                url: this.product.pieceUrl,
                showRefresh: true,
                autoScaling: `1`,
                portraitRatio: '3/4',
                landscapeRatio: '16/9'
            } as IframeBlock
    
            
            return iframeObject
        }        
    },
    data() {
        return {
            mainImageHasBeenLoaded: false,
            selectedImage: undefined as undefined | MediaImage,
        }
    },
    watch: {
        "product": {
            handler() {
                if (this.product && this.product.images && this.product.images.length > 0) {
                    this.selectedImage = this.product.images[0]
                }
            },
            immediate: true
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
    },
    unmounted() {
    },
    methods: {
        imageLoaded() {
            gsap.to(this.$el.querySelectorAll(".product-page > *"), {
                opacity: 1,
                duration: 0.48,
                ease: "power2.out",
                stagger: 0.2
            })
        },
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
    }
})

</script>

<style lang="scss">
@use "@/assets/scss/variables.scss";



.site-breadcrumbs {
    margin-top: 40px;
    margin-left: 8px;
}

.product-page-thumbnails-container {    
    grid-column: span 2;
    container-name: product-page-thumbnails;
    container-type: inline-size;
}

.product-page-thumbnails {
    display: grid;
    gap: 8px;
    margin: 0;
    width: 100%;
    grid-template-columns: repeat(2, 1fr);


    img {
        width: 100%;
        opacity: .4;
        transition: var(--transition-default);
        filter: grayscale(1);
        
        &:hover {
            filter: grayscale(0.6);
            opacity: 1;
            cursor: pointer;
        }

        &.main-image {
            grid-column: span 4;
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

.product-page-content {
    display: flex;
    flex-flow: column-reverse;
    grid-column: span 2;
    // contain:size;
    overflow-y: auto;

    h1 {
        margin: -6px 0 0;
        position: absolute;
        top: 80px;
        flex: none; 
    }

    h2 {
        margin: 4px 0 0;
        font-size: 16px;
        font-weight: 600;
        opacity: .8;
        position: absolute;
        top: 108px;
        flex: none; 
    }
}

.product-page-details {
    background-color: var(--bg-color);
    padding: 16px;
    margin-top: 16px;
    overflow-y: auto;
    display: flex;
    flex-flow: column;
    justify-content: space-between;
    gap: 16px;
}

.product-page-purchase-section {
    // padding-top: 32px;
    display: flex;
    justify-content: space-between;
    width: 100%;
    flex: none; 
}

.product-page-price {
    font-family: var(--accent-font);
    font-size: 40px;
    display: flex;
    align-items: center;
    padding-left: 16px;
}

.product-page-button-container {
    font-family: var(--accent-font);
    font-size: 24px;

    a {
        display: flex;
        justify-content: center;
        align-items: center;
        text-decoration: none;
        height: 100%;
        font-size: 16px;
    }
}


.product-page {
    display: grid;
    grid-template-columns: 1fr 128px;
    gap: 16px 40px;
    padding: 16px;
    margin: auto;
    max-width: 144vh;

    container-name: product-page;
    container-type: inline-size;

    > * {
        opacity: 0;
    }

    .iframe-block {
        grid-column: span 2;
        padding-top: 8px;
    }
}

.product-page-table-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(0,0,0,.072);
    font-size: 16px;

    &:last-child {
        border-bottom: none;
    }
}

.product-page-table-key {
    font-weight: 600;
    font-family: var(--accent-font);    
}
.product-page-table-value {
    font-size: 14px;
}

@media screen and (min-width: 640px) {
    .site-breadcrumbs {
        margin-left: 16px;
        margin-top: 60px;
    }

    .product-page-thumbnails-container {
        gap: 16px;
        // grid-column: span 1;
    }
}

@media screen and (min-width: 800px) {

    .product-page {
        grid-template-columns: 1fr 1fr;
    }
    .site-breadcrumbs {
        margin-top: 80px;
    }
}

.product-page-image {
    grid-column: span 2;
    padding-top: 64px;

    img {
        width: 100%;
    }
}

.product-description {
    font-size: 14px; 
    max-height: 100%;
    overflow: auto;

    p {
        margin: 0;
    }
}

//////////////////////////////////////////////////////
// PRODUCT PAGE CONTAINER QUERIES
//////////////////////////////////////////////////////
// 600px
@container product-page (min-width: 600px) {
    .product-page-content {
        flex-flow: column;
        
        h1, h2 {
            position: static;    
        }
    }

    .product-page-button-container {
        a {
            font-size: 24px;
        }
    }
    
    .product-page-image {
        grid-column: span 1;
    }
    
    .product-page-image {
        padding-top: 0;
    }
    
    .product-page-purchase-section {
        padding-top: 32px;
    }
    
    .product-page-thumbnails-container {
        grid-column: span 1;
    }
}

// PRODUCT PAGE CONTAINER QUERY
// 800px

@container product-page (min-width: 800px) {
    .product-page {
        grid-template-columns: 1fr 1fr;
    }

    .product-page-content {
        grid-column: 2/3;
        grid-row: 1;
    }
    .product-page-details {
        flex: 1 1 0; 
        min-height: 0;  
    }

}


@container product-page-thumbnails (min-width: 129px) {
    .product-page-thumbnails {
        grid-template-columns: repeat(4, 1fr);
    }
}
@container product-page-thumbnails (min-width: 320px) {
    .product-page-thumbnails {
        grid-template-columns: repeat(6, 1fr);
        img {
            &.main-image {
                grid-column: span 6;
            }
        }
    }
}
@container product-page-thumbnails (min-width: 480px) {
    .product-page-thumbnails {
        grid-template-columns: repeat(8, 1fr);
        
        img {
            &.main-image {
                grid-column: span 8;
            }
        }
    }
}
</style>