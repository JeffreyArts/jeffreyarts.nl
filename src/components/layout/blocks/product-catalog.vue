<template>
    <div class="product-catalog-block">
        <div class="product-catalog-grid">
            <div class="product-catalog-filter">
                <h3>Filter options</h3>
                <hr>
                <div class="product-catalog-filter-options">
                    
                    <selectBox
                        class="site-filter-section"
                        name="Year"
                        :options="filterOptions.years"
                        />
                        <!-- @change="updateYear" -->

                    <div class="product-catalog-filter-option-checkbox">
                        <label for="site-filter-price">Price</label>

                        <div class="prices">
                            <checkBox 
                                class="site-filter-section"
                                name="Low"
                                v-model="priceLow"
                                :class="[priceLow ? '__isSelected' : '']" />

                            <checkBox 
                                class="site-filter-section"
                                name="Mid"
                                v-model="priceMid"
                                :class="[priceMid ? '__isSelected' : '']" />

                            <checkBox 
                                class="site-filter-section"
                                name="High"
                                v-model="priceHigh"
                                :class="[priceHigh ? '__isSelected' : '']" />
                        </div>
                            
                    </div>
                </div>
            </div>
            <div class="product-catalog" v-if="options.products.length > 0">
                <productThumbnail v-for="product in filteredProducts" :options="product" @blockLoaded="blockLoaded(block)"></productThumbnail>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import PayloadStore from "@/stores/payload"
import { MediaImage, Product } from "@/types/payload-stores"
import productThumbnail from "./product-thumbnail.vue"
import SelectBox, { SelectBoxOptions } from  "@/components/form/selectbox.vue"
import checkBox from "@/components/form/checkbox.vue"

export type ProductCatalogBlock = {
    blockType: "productCatalog"
    products: Product[]
}

export default defineComponent ({
    name: "productCatalogBlock",
    data: function() {
        return {
            hasEmittedBlockLoaded: false,
            thumbnailsLoaded: 0,
            priceLow: false,
            priceMid: false,
            priceHigh: false,
            filterOptions: {
                years: [] as SelectBoxOptions[],
                price: [] as Array<"high" | "mid" | "low">
            }
        }
    },
    components: {productThumbnail, SelectBox, checkBox},
    computed: {
        filteredProducts(){

            let res = [...this.options.products]

            const selectedYears = this.filterOptions.years
                .filter(year => year.selected)
                .map(year => String(year.value))

            
            const activePriceFilters = {
                low: this.priceLow,
                mid: this.priceMid,
                high: this.priceHigh,
            }

            // Update result based on years
            if (selectedYears.length > 0) {
                res = res.filter(product => {
                    let years = []
                    
                    if (Array.isArray(product.year))  {
                        years = product.year.map(String)  
                    }  else {
                        years = [ String(product.year) ]
                    } 
                    
                    return years.some(year => selectedYears.includes(year))
                })
            }

            // Update result based on price
            const selectedPriceRanges = Object.entries(activePriceFilters)
                .filter(([, isSelected]) => isSelected)
                .map(([key]) => key)

            if (selectedPriceRanges.length > 0) {
                res = res.filter(product => {
                    const price = Number(product.price) || 0

                    return selectedPriceRanges.some(range => {
                        if (range === "low") return price <= 40
                        if (range === "mid") return price > 40 && price <= 400
                        if (range === "high") return price > 480
                        return false
                    })
                })
            }


            return res

        }
    },
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
            this.payload.GET("products?depth=1").then(res => {
                this.options.products = res.data.docs

                this.options.products.forEach(v => {
                    // fill the filterOptions with the year values of the products
                    if (Array.isArray(v.year)) {
                        v.year.forEach(year => {
                            if (this.filterOptions.years.filter(y => y.value == v.year).length <= 0) {
                                this.filterOptions.years.push({
                                    value: year,
                                    label: year,
                                    selected: false,
                                    available: true,
                                })
                            }
                        })
                    }
                })
            })
        }
    },
    mounted() {
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
        },
        blockLoaded(b) {
            this.thumbnailsLoaded ++
            if (this.thumbnailsLoaded == this.options.products.length) {
                this.emitBlockLoaded()
            }
        }
    }
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables";
.product-catalog-block {
    container-type: inline-size;
    container-name: productCatalog;
}
.product-catalog-grid {
    display: grid;
    grid-template-columns: auto;
    gap: 40px;
}
        
.product-catalog-filter {
    background-color: var(--bg-color);

    h3 {
        padding: 16px 32px;
        margin: 0;
        font-weight: normal;
    }

}

.product-catalog {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    justify-content: start;
    gap: 40px;
}

.product-catalog-filter-options {
    padding: 16px 32px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;

    .selectbox {
        width: 100%;
    }
    .checkbox {
        flex-flow: row-reverse;
        width: 100%;
        justify-content: flex-end;
    }
}

.product-catalog-filter-option-checkbox {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

@container productCatalog (min-width: 360px) {
    .product-catalog { grid-template-columns: repeat(2, 1fr); }
}
@container productCatalog (min-width: 720px) {
    .product-catalog-grid { grid-template-columns: 240px auto; }
    .product-catalog { grid-template-columns: repeat(2, 1fr); }
}
@container productCatalog (min-width: 800px) {
    .product-catalog-grid { grid-template-columns: 320px auto; }
    .product-catalog { grid-template-columns: repeat(2, 1fr); }
}
@container productCatalog (min-width: 1080px) {
    .product-catalog { grid-template-columns: repeat(3, 1fr); }
}
@container productCatalog (min-width: 1440px) {
    .product-catalog { grid-template-columns: repeat(4, 1fr); }
}
@container productCatalog (min-width: 1800px) {
    .product-catalog { grid-template-columns: repeat(5, 1fr); }
}
@container productCatalog (min-width: 2160px) {
    .product-catalog { grid-template-columns: repeat(6, 1fr); }
}
@container productCatalog (min-width: 2520px) {
    .product-catalog { grid-template-columns: repeat(7, 1fr); }
}

</style>