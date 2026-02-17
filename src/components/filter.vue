<template>
    <div class="site-filter-container">
        <header class="site-filter">
            <div class="site-filter-left">
                <jaoIcon :name="filterIcon" size="large" :transit-effect="{duration: 1, delay:0.02, effect: 'shuffle'}" class="site-filter-icon"/>
                <h4 class="site-filter-name">{{ filterName }}</h4>
            </div>
            
            <div class="site-filter-right">
                <template v-for="filter,k in options.displayFilters" :key="k">
                    <checkBox :style="`order: ${k}`"
                        v-if="filter == 'onlyFavorites'"
                        class="site-filter-section"
                        name="Only favorites"
                        v-model="filterVal.onlyFavorites"
                        :class="[filterVal.onlyFavorites ? '__isSelected' : '']" />
                        
                    <selectBox :style="`order: ${k}`"
                        v-if="filter == 'year'"
                        class="site-filter-section"
                        name="Year"
                        @change="updateYear"
                        :options="filterOptions.year"
                        />

                    <selectBox :style="`order: ${k}`"
                        v-if="filter == 'series'"
                        class="site-filter-section"
                        @change="updateSeries"
                        name="Series"
                        :options="filterOptions.series"
                        />
                        
                    <selectBox :style="`order: ${k}`"
                        v-if="filter == 'categories'"
                        class="site-filter-section"
                        @change="updateCategories"
                        name="Categories"
                        :options="filterOptions.categories"
                        />
                </template>
            </div>
                
        </header>
        <Layout v-if="blocks.length > 0" id="filter-layout" :options="{
                layoutGap: 40,
                id: 'filter',
                layoutSize: layoutSize,
                blocks: blocks
            }"
            :class="{'__hideLoader': blocks.length > 24}"
            ref="filter-layout"/>
        
        <div class="loading-more" v-if="!updating && hasNextPage">
            Loading more...
        </div>
    </div>
</template>


<script lang="ts">
import { defineComponent, PropType } from "vue"
import Filter from "./../services/filter"
import jaoIcon from "./jao-icon.vue"
import selectBox, { SelectBoxOptions } from "./form/selectbox.vue"
import checkBox from "./form/checkbox.vue"
import { BlockType } from "@/components/layout/layout-types"
import Layout from "@/components/layout/index.vue"
import { map, filter, find } from "lodash"
import { PageType } from "@/model/payload/page"
import gsap from "gsap"

type TargetCollections = "projects" | "pieces"

export type FilterOptions = {
    type: string
    name: string
    targetCollection: TargetCollections | TargetCollections[]
    prefill: {
        year?:  string[]
        projects?: {id:string}[]
        series?: {id:string}[]
        categories?:  {id:string}[]
    }
    displayFilters: string[] 
}

export default defineComponent({
    name: "filterComponent",
    components: {
        jaoIcon,
        selectBox,
        checkBox,
        Layout
    },
    props: {
        options: {
            type: Object as PropType<FilterOptions>,
            required: true
        },
        pageDetails: {
            type: Object as PropType<PageType>,
            required: false
        },
    },
    emits: ["filterUpdated"],
    data() {
        return {
            blocks: [] as Array<BlockType>,
            page: 1,
            temp: 0,
            newProjectsPerLoad: 16,
            layoutSize: 4,
            updating: false,
            hasNextPage: false,
            nextPage: 0,
            firstLoad: false,
            filterVal: {
                onlyFavorites: false,
                yearOpen: false,
            },
            filterOptions: {
                onlyFavorites: true,
                year: [] as SelectBoxOptions[],
                categories: [] as SelectBoxOptions[],
                series: [] as SelectBoxOptions[],
            },
            filterName: "",
            filterIcon: "empty",
        }
    },
    watch: {
        "$route.path": {
            handler() {
                // Set page back to default when route has changed
                this.updateLayoutSize()
                this.reset()
                this.setDefaults()
                // Remove old content
                // if (this.$refs["filter-layout"]) {
                //     const filterLayout = this.$refs["filter-layout"] as InstanceType<typeof Layout>
                //     filterLayout.newBlocks = []
                //     filterLayout.blocks = []
                //     filterLayout.processing = false
                // }
                this.updateResults()
            },
            immediate: true
        },
        "options.name": {
            handler(Name: string) {
                if (!Name) {
                    return
                }
                const name = Name.toLowerCase()
                if (name === "archive") {
                    this.filterIcon = "archive"
                    this.filterName = "Archive"
                } else if (name === "projects") {
                    this.filterIcon = "hammer"
                    this.filterName = "Projects"
                } else if (name === "tools") {
                    this.filterIcon = "wrench"
                    this.filterName = "Tools"
                } else if (name === "<same_project>" || name === "same_project") {
                    this.filterIcon = "hammer"
                    this.filterName = Name

                    if ( this.pageDetails?.project) {
                        this.filterName = this.pageDetails.project.title
                        this.filterIcon = "wrench"
                    } else if ( this.pageDetails?.title) {
                        this.filterName = this.pageDetails.title
                    }
                } else if (name === "<query>") {
                    this.filterIcon = "archive" 
                    this.filterName = "" // This is being updated in setDefaults()
                } else {
                    this.filterIcon = "archive"
                    this.filterName = Name
                }
                
            },
            immediate: true
        },
        "options.displayFilters": {
            handler(filterNames: string[]) {
                if (!filterNames) {
                    return
                }
                const promises = [] as Array<Promise<unknown>>
                filterNames.forEach(filterName => {
                    if (filterName === "series") {
                        const seriePromise = Filter.getSeries()
                        seriePromise.then(res => { this.filterOptions.series = res })
                        promises.push(seriePromise)
                    } else if (filterName === "year") {
                        const yearsPromise = Filter.getYears("all")
                        yearsPromise.then(res => { this.filterOptions.year = res })
                        promises.push(yearsPromise)
                    } else if (filterName === "categories") {
                        const categoriesPromise = Filter.getCategories()
                        categoriesPromise.then(res => { this.filterOptions.categories = res })
                        promises.push(categoriesPromise)
                    }
                })

                Promise.all(promises).then((results) => {
                    this.setDefaults()
                    this.updateResults()
                })
            },
            immediate: true
        },
        "$route.query": {
            handler() {
                this.reset()
                this.setDefaults()
            },
            deep: true
        },
    },
    beforeCreate() {
    },
    mounted() {
        this.setupScrollEvent()
        window.addEventListener("resize", this.onResizeEvent)
        window.addEventListener("blocksFadedIn", this.onScrollEvent)
        window.addEventListener("layoutLoaded", this.setupScrollEvent) 
        // window.addEventListener("layoutChange", this.fadeInBlocks)
    },
    unmounted() {
        window.removeEventListener("resize", this.onResizeEvent)
        window.removeEventListener("blocksFadedIn", this.onScrollEvent)
        window.removeEventListener("layoutLoaded", this.setupScrollEvent) 
        document.removeEventListener("scroll", this.onScrollEvent)
    },
    methods: {
        onResizeEvent() {
            this.updateLayoutSize()
        },
        onScrollEvent() {

            if (this.$el) { 
                const blocks = this.$el.querySelectorAll(".block.__isFadedIn")
                this.temp = blocks.length === this.blocks.length
            }
            

            // If the scroll position is greater than the layout height, load the next page
            if (this.bottomOfPage()) {
                this.page = this.nextPage
                this.updateResults(this.page)
                // document.removeEventListener("scroll", this.onScrollEvent)
            }
        },
        blocksAdded() {
            if (!this.$el) { 
                return
            }
            const blocks = this.$el.querySelectorAll(".block.__isFadedIn") 
            return blocks.length >= this.blocks.length - this.newProjectsPerLoad * .25
        },
        bottomOfPage() {
            // Do not load next page if there is no next page or if we are already updating
            
            const layout = this.$refs["filter-layout"] as HTMLElement
            if (!layout) { 
                return
            }
            
            if (!this.hasNextPage || this.updating || !this.blocksAdded()) { 
                return false
            }
            const layoutHeight = document.body.clientHeight - window.innerHeight * 1.5
            const scrollPosition = window.scrollY + window.innerHeight
            
            return scrollPosition >= layoutHeight
        },
        setupScrollEvent() {
            console.info("%cSetting up scroll event", "background-color: #09f; color: white; padding: 4px 8px;")
            // If the scroll position is greater than the layout height, load the next page
            if (this.bottomOfPage()) {
                this.page = this.nextPage
                this.updateResults(this.page)
            } else {
                document.addEventListener("scroll", this.onScrollEvent)
            }
        },
        setDefaults() {
            // Process filter prefils

            // Prefill series
            if (this.options.prefill.series) {
                this.options.prefill.series.forEach(serie => {
                    const foundSerie = find(this.filterOptions.series, { value: serie.id })
                    if (foundSerie) {
                        foundSerie.selected = true
                        foundSerie.disabled = true
                    }
                });
            }

            // Prefill categories
            if (this.options.prefill.categories) {
                this.options.prefill.categories.forEach(category => {
                    const foundCategory = find(this.filterOptions.categories, { value: category.id })
                    if (foundCategory) {
                        foundCategory.selected = true
                        foundCategory.disabled = true
                    }
                });
            }

            // Process year
            if (this.options.prefill.year) {
                this.options.prefill.year.forEach(year => {
                    const foundYear = find(this.filterOptions.year, { value: Number(year) })
                    if (foundYear) {
                        foundYear.disabled = true
                        foundYear.selected = true
                    }
                });
            }

            // Process route queries
            if (this.$route.query.series) {
                const series = this.$route.query.series.split(",")
                series.forEach((serie: string) => {
                    const foundSerie = find(this.filterOptions.series, { value: serie })
                    if (foundSerie) {
                        foundSerie.selected = true
                    }
                })
            }

            // Process route queries - categories
            if (this.$route.query.categories) {
                const categories = this.$route.query.categories.split(",")
                categories.forEach((category: string) => {
                    const foundCategory = find(this.filterOptions.categories, { value: category })
                    if (foundCategory) {
                        foundCategory.selected = true
                    }
                })
            }

            // Process route queries - year
            if (this.$route.query.year) {
                const year = this.$route.query.year.split(",")
                year.forEach((year: number) => {
                    const foundYear = find(this.filterOptions.year, { value: Number(year) })
                    if (foundYear) {
                        foundYear.selected = true
                    }
                })
            }

            // Update filter name if it is based on <query>
            if (this.options.name === "<query>") {
                if (this.$route.query) {
                    if (this.$route.query.series) {
                        const foundSeries = filter(this.filterOptions.series, { value: this.$route.query.series })
                        if (foundSeries.length > 0) {
                            this.filterName = foundSeries[0].label.toString()
                        }
                    } else if (this.$route.query.categories) {
                        const foundCategories = filter(this.filterOptions.categories, { value: this.$route.query.categories })
                        if (foundCategories.length > 0) {
                            this.filterName = foundCategories[0].label.toString()
                        }
                    } else if (this.$route.query.year) {
                        const foundYears = filter(this.filterOptions.year, { value: this.$route.query.year })
                        if (foundYears.length > 0) {
                            this.filterName = foundYears[0].label.toString()
                        }
                    } else {
                        this.filterName = "Archive"
                    }
                }
            }
        },
        reset() {
            map(this.filterOptions.series, serie => { serie.selected = false })
            map(this.filterOptions.categories, category => { category.selected = false  })
            map(this.filterOptions.year, year => { year.selected = false  })
            
            this.blocks = []
            this.updating = false
            this.firstLoad = true
            this.nextPage = 0
            this.hasNextPage = false
        },
        updateLayoutSize() {
            if (window.innerWidth > 1240) {
                this.layoutSize = 12
            } else if (window.innerWidth > 800) {
                this.layoutSize = 9
            } else if (window.innerWidth > 640) {
                this.layoutSize = 9
            } else {
                this.layoutSize = 6
            }
        },
        updateSeries() {
            this.page = 1
                this.nextPage = 0
                this.hasNextPage = false

            this.blocks.length = 0
            const querySeries = filter(this.filterOptions.series, { selected: true }).map(serie => serie.value).join(",")

            this.$router.replace({
                query: {
                    ...this.$route.query,
                    series: querySeries
                }
            })
            this.updateResults()
        },
        updateYear() {
            this.page = 1
            this.nextPage = 0
            this.hasNextPage = false

            this.blocks.length = 0
            const queryYears = filter(this.filterOptions.year, { selected: true }).map(year => year.value).join(",")

            this.$router.replace({
                query: {
                    ...this.$route.query,
                    year: queryYears
                }
            })
            this.updateResults()
        },
        updateCategories() {
            this.page = 1
            this.nextPage = 0
            this.hasNextPage = false

            this.blocks.length = 0
            const queryCategories = filter(this.filterOptions.categories, { selected: true }).map(category => category.value).join(",")

            this.$router.replace({
                query: {
                    ...this.$route.query,
                    categories: queryCategories
                }
            })
            this.updateResults()
        },
        updateResults(page = 1) {
            if (this.updating || typeof this.nextPage !== "number") {
                return
            }

            if (this.$refs["filter-layout"]) {
                const filterLayout = this.$refs["filter-layout"] as InstanceType<typeof Layout>
                filterLayout.processing = true
            }

            if (!this.firstLoad) {
                gsap.to(this.$el.querySelector(".loading-more"), { opacity: 1, duration: 0.32 })
            }
            
            this.updating = true
            
            const query = {
                limit: this.newProjectsPerLoad,
                page: page
            } as {
                limit: number
                page: number
                project?: string
                archived?: boolean
                series?: Array<string>
                categories?: Array<string>
                projects?: Array<string>
                year?: Array<string>
            }

            if ((this.options.name.toLowerCase() === "same_project" || this.options.name.toLowerCase() === "<same_project>") && this.pageDetails) {
                if (this.pageDetails?.project){
                    query.project = this.pageDetails?.project.id
                } else {
                    query.project = this.pageDetails.id
                }
            }

            if (this.options.name.toLowerCase() === "archive") {
                // Archive mag ook niet archived projecten tonen
                // query.archived = true
            }
            
            if (this.options.name.toLowerCase() === "projects") {
                query.archived = false
            }
            
            //
            // Process filters
            //

            // ⏱️ SERIES
            const series = filter(this.filterOptions.series, { selected: true })
            if (series.length > 0) {
                query.series = series.map(serie => serie.value.toString())
            }
            
            // ⏱️ CATEGORIES
            const categories = filter(this.filterOptions.categories, { selected: true })
            if (categories.length > 0) {
                query.categories = categories.map(serie => serie.value.toString())
            }
            
            // ⏱️ YEAR
            const year = filter(this.filterOptions.year, { selected: true })
            if (year.length > 0) {
                query.year = year.map(serie => serie.value.toString())
            }

            // ⏱️ Projects
            if (this.options.prefill.projects) {
                query.projects = this.options.prefill.projects.map(project => project.id)
            }


            // Make API request with the processed query
            Filter.query(this.options.targetCollection, query).then((data) => {
                this.hasNextPage = data.hasNextPage
                this.nextPage = data.nextPage
                
                if (this.options.targetCollection === "projects") {                    
                    data.docs.forEach((doc) => {
                        const block = {
                            size: 3,
                            id: doc.id,
                            data: {
                                blockType: "projectThumbnail",
                                link: doc.path,
                                title: doc.title,
                                categories: doc.categories,
                                image: doc.thumbnail
                            }
                        } as BlockType
                        
                        this.blocks.push(block)
                    })
                } else if (this.options.targetCollection === "pieces") {                    
                    data.docs.forEach((doc) => {
                        const block = {
                            size: 3,
                            id: doc.id,
                            data: {
                                blockType: "pieceThumbnail",
                                piece: doc
                            }
                        } as BlockType
                        
                        this.blocks.push(block)
                    })
                }  
                
                this.$emit("filterUpdated")
                this.$nextTick(() => {
                    this.updating = false

                    if (this.$refs["filter-layout"]) {
                        const filterLayout = this.$refs["filter-layout"] as InstanceType<typeof Layout>
                        filterLayout.processing = false
                    }
                })
            }).catch(err => {
                this.$emit("filterUpdated")
                console.error(err)
                this.updating = false
            })
        },
    }
})
</script>

<style lang="scss">
@use "./../assets/scss/variables";
.site-filter {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    font-family: var(--accent-font);
    background-color: var(--bg-color);
    margin-top: 40px;

    + .layout-wrapper {
        padding-top: 40px;
    }
}

.site-filter-icon {
    height: 26px;
}

.site-filter-chevron {
    height: 10px;
    margin-left: 8px;
}

.site-filter-left {
    display: flex;
    flex-flow: row;
    align-items: center;
    gap: 8px;
    padding-left: 16px;
}

.site-filter-right {
    width: 66%;
    padding-right: 16px;
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    gap: 24px;
}

.site-filter-name {
    font-size: 18px;
    margin: 40px 0;
}

.site-filter-section {
    display: flex;
    width: calc(50% - 16px);
    flex-flow: row;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
    position: relative;
    color: #555;
    
    &.__isSelected {
        color: #222;
    }

    &.__isOpen {
        .site-filter-select-options {
            display: flex;
        }
    }
}

.site-filter-select-options {
    position: absolute;
    display: none;
    left: 0;
    max-height: 100px;
    overflow: auto;
    width: calc(100% - 24px);
    background-color: #fff;
    gap: 8px;
    flex-flow: row wrap;
}

.site-filter-select-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;

    &.__isHidden {
        display: none;
    }
}

.site-filter-container {
    min-height: 512px;
}


@media all and ( min-width: 640px) {
    .site-filter-name {
        font-size: 24px;
        margin: 40px 0;
    }

    .site-filter-icon {
        height: 52px;
    }
    .site-filter-right {
        width: 50%;
    }

    .site-filter-left {
        gap: 16px;
    }
}

#filter-layout .block {
    opacity: 0;
}

#filter-layout.__hideLoader {
    .layout-loader {
        display: none;
    }
}

.loading-more {
    width: 100%;
    text-align: center;
    padding: 16px;
    font-family: var(--accent-font);
}
</style>
