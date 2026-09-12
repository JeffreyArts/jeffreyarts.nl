<template>
    <div class="product-catalog-block">
        TEST
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"


export type ProductCatalogBlock = {
    blockType: "productCatalog"
    products: {name: string, url: string}[]
}

export default defineComponent ({
    name: "productCatalogBlock",
    watch: {
        "options": {
            handler() {
                this.$nextTick(() => {
                    this.$emit("blockLoaded")
                })
            },
            deep: true,
            immediate: true
        }
    },
    mounted() {
        console.log("Tihii")
            this.$emit("blockLoaded")
    },
    props: {
        options: {
            type: Object as PropType<ProductCatalogBlock>,
            required: true
        },
    },
    methods: {
        textLoaded() {
            this.$emit("blockLoaded")
        }
    }
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables";
.tags-block {
    width: 100%;

    a {
        line-height: 1.28;
        padding: 4px 8px;
        display: inline-block;
        font-size: 14px;
        font-family: var(--accent-font);
        text-decoration: none;
        color: var(--bg-color);
        background-color: var(--contrast-color);
        margin-right: 4px;
        margin-bottom: 4px;
        transition: background-color 0.16s ease;

        &:hover, &:focus {
            background-color: var(--accent-color);
        }
    }
}

</style>