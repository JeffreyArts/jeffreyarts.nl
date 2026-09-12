<template>
    <div class="product-catalog-block">
        <div class="filter"></div>
        <div class="product-catalog" v-if="options.products.length > 0">
            <productThumbnail v-for="product in options.products" :options="product"></productThumbnail>

        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import PayloadStore from "@/stores/payload"
import { MediaImage, Product } from "@/types/payload-stores"
import productThumbnail from "./product-thumbnail.vue"

export type ProductCatalogBlock = {
    blockType: "productCatalog"
    products: Product[]
}

export default defineComponent ({
    name: "productCatalogBlock",
    data: function() {
        return {
            hasEmittedBlockLoaded: false
        }
    },
    components: {productThumbnail},
    watch: {
        "options": {
            handler() {
                if (!Array.isArray(this.options.products)) {
                    if (typeof this.options.products !== "undefined") {
                        this.options.products = [ this.options.products ]
                    } else {
                        this.options.products = []
                    }
                }
                this.$nextTick(() => {
                    this.emitBlockLoaded()
                })
            },
            deep: true,
            immediate: true
        }
    },
    setup() {
        const payload = PayloadStore()
        return { payload }    
    },
    async beforeCreate() {
        if (!this.options.products) {
            this.payload.GET("products?depth=0").then(res => {
                this.options.products = res.data.docs
                this.emitBlockLoaded()
            })
        }
    },
    mounted() {
        this.emitBlockLoaded()
    },
    props: {
        options: {
            type: Object as PropType<ProductCatalogBlock>,
            required: true
        },
    },
    methods: {
        emitBlockLoaded() {
            if (!this.hasEmittedBlockLoaded) {
                this.$emit("blockLoaded")
                this.hasEmittedBlockLoaded = true
            }
        }
    }
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables";
.product-catalog {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    justify-content: start; 
}

@media all and (min-width: 360px) {
    .product-catalog { grid-template-columns: repeat(2, 1fr); }
}
@media all and (min-width: 720px) {
    .product-catalog { grid-template-columns: repeat(3, 1fr); }
}
@media all and (min-width: 1080px) {
    .product-catalog { grid-template-columns: repeat(4, 1fr); }
}
@media all and (min-width: 1440px) {
    .product-catalog { grid-template-columns: repeat(5, 1fr); }
}
@media all and (min-width: 1800px) {
    .product-catalog { grid-template-columns: repeat(6, 1fr); }
}
@media all and (min-width: 2160px) {
    .product-catalog { grid-template-columns: repeat(7, 1fr); }
}
@media all and (min-width: 2520px) {
    .product-catalog { grid-template-columns: repeat(8, 1fr); }
}

</style>