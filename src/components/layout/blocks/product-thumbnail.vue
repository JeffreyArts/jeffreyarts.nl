<template>
    <router-link :to="url" class="product-thumbnail-block">
        <figure class="product-thumbnail-image-container">
            <img :src="image" class="product-thumbnail-image" ref="image"/>
        </figure>
        <div class="product-thumbnail-details">
            <h3 class="product-thumbnail-title">
                {{ title }}
            </h3>
            <span class="product-thumbnail-price">
                {{ price }}
            </span>
        </div>
        <span class="button product-thumbnail-button"><span>view details</span></span>
    </router-link>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { Product } from "@/types/payload-stores";
export type ProductThumbnailBlock = {
    blockType: "productThumbnail",
} & Product

export default defineComponent ({
    name: "productThumbnailBlock",
    watch: {
    },
    mounted() {
        this.loadImage();
    },
    computed: {
        title() {
            if (!this.options) {
                return "#ERROR"
            }
            return this.options.title
        },
        price() {
            if (!this.options) {
                return "#ERROR"
            }
            const formatted = new Intl.NumberFormat("nl-NL", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(this.options.price)

            // €1.000,00 -> €1.000,-
            return formatted.replace(",00", ",-")
        },
        url() {
            if (!this.options) {
                return ""
            }

            return this.options.path || ""
        },
        image() {
            if (!this.options){
                return undefined
            }
            
            if (!this.options.images){
                return undefined
            }

            if (this.options.images.length < 1){
                return undefined
            }

            if (typeof this.options.images[0].image === "object") {
                return `${import.meta.env.VITE_PAYLOAD_ENDPOINT}/${this.options.images[0].image.sizes.image_sm.url}`
            }
        }
    },
    props: {
        options: {
            type: Object as PropType<ProductThumbnailBlock>,
            required: true
        },
    },
    methods: {
        
        loadImage() {
            const img = this.$refs["image"] as HTMLImageElement;
            
            if (!img) {
                return;
            }

            img.addEventListener("load", this.loadHandler);
            img.addEventListener("error", this.loadHandler);
            
            if (img.complete && img.src) {
                setTimeout(this.loadHandler, 0)
                return;
            }
        },
        loadHandler() {
            this.$emit("blockLoaded");
        }
    },
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables";

.product-thumbnail-block {
    text-decoration: none;
    display: flex;
    flex-flow: column;
    align-items: center;
    color: var(--text-color);
    transition: var(--transition-default);
    transition-timing-function: linear(0, 0.528 7%, 0.921 14.4%, 1.07 18.3%, 1.19 22.4%, 1.28 26.7%, 1.34 31.2%, 1.366 34.5%, 1.378 38%, 1.377 41.7%, 1.363 45.6%, 1.308 53.3%, 1.13 71.3%, 1.059 80.1%, 1.013 89.7%, 1);

    .product-thumbnail-image-container {
        margin: 0;
        overflow: hidden;
        width: 100%;
        display: flex;
        aspect-ratio: 1;

        img {
            object-fit: cover;
        }
    }

    &:hover, &:focus {
        scale: 1.02;

        .product-thumbnail-image {
            scale: 1.2;
        }
        
        .product-thumbnail-button {
            // translate: 0 -4px;
            width: calc(80% + 32px);
            scale: 1.05;
            max-width: calc(160px + 32px);
        }

        .product-thumbnail-price {
            opacity: 1;
        }
    }
    
    .product-thumbnail-image {
        width: 100%;
        transition: var(--transition-default);
        transition-timing-function: linear(0, 0.528 7%, 0.921 14.4%, 1.07 18.3%, 1.19 22.4%, 1.28 26.7%, 1.34 31.2%, 1.366 34.5%, 1.378 38%, 1.377 41.7%, 1.363 45.6%, 1.308 53.3%, 1.13 71.3%, 1.059 80.1%, 1.013 89.7%, 1);
    }
    
    .product-thumbnail-title {
        font-family: var(--accent-font);
        margin: 0;
        font-size: 24px;
        height: 64px;
    }
    
    .product-thumbnail-price {
        margin: 4px 0 0;
        display: inline-block;
        font-size: 14px;
        opacity: 0.72;
        transition: var(--transition-default);
    }
    
    .product-thumbnail-details {
        background-color: var(--bg-color);
        text-align: left;
        width: 100%;
        padding: 8px 16px 32px;
    }
    
    .product-thumbnail-button {
        font-family: var(--accent-font);
        background-color: var(--contrast-color);
        color: var(--bg-color);
        padding: 4px 12px;
        transition: var(--transition-default);
        transition-timing-function: linear(0, 0.528 7%, 0.921 14.4%, 1.07 18.3%, 1.19 22.4%, 1.28 26.7%, 1.34 31.2%, 1.366 34.5%, 1.378 38%, 1.377 41.7%, 1.363 45.6%, 1.308 53.3%, 1.13 71.3%, 1.059 80.1%, 1.013 89.7%, 1);
        font-size: 16px;
        text-decoration: none;
        display: flex;
        justify-content: center;
        align-items: center;
        max-width: 160px;
        width: 80%;
        margin-top: -20px;
    }
}

</style>