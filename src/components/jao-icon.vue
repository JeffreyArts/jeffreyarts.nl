<template>
    <svg :name="name" class="jao-icon" version="1.1" :viewBox="`0 0 ${svgWidth} ${svgHeight}`" xmlns="http://www.w3.org/2000/svg">
        <g v-if="displayGrid.length > 0">
            <rect class="jao-icon-cell" v-for="(cell,x) in displayGrid" :key="x"
                :x="1 + cell.x * 10" 
                :y="1+ cell.y * 10" 
                :v="cell.v" 
                width="8" 
                height="8"
                :style="`fill:${cell.color};`"
                />
        </g>
    </svg>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import _ from "lodash"
import gsap from "gsap"
import { iconsMap } from "jao-icons"

/* 
This icon component uses a two-dimensional grid, with cells of 8x8 pixels - with a gap of 1px around each cell

You'll use it by specifing a size (small, medium or large), in combination with the name of the icon you'd like to display
You can also specify entire custom icons by specifying a two-dimensional array with truthy/falsey values

small = 9x9
medium = 13x13
large = 21x21

*/

interface CustomGridPoint {
    x: number;
    y: number;
    value: 0 | 1;
}

export type transitEffect = {
    duration?: number;
    ease?: string;
    delay?: number,
    effect?: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top" | "shuffle"
}

export default defineComponent ({
    name: "SiteMenu", 
    props: {
        size: {
            type: String  as PropType<"small" | "medium" | "large">,
            required: true
        },
        inactiveColor: {
            type: String,
            required: false
        },
        activeColor: {
            type: String,
            required: false
        },
        name: {
            type: String,
            required: true
        },
        custom: {
            type: Array as PropType<CustomGridPoint[]>,
            required: false
        },
        transitEffect: {
            type: Object as PropType<transitEffect>,
            required: false
        }
    },
    data() {
        return {
            iconsMap: iconsMap,
            originalIcon: [] as Array<Array<0 | 1>>,
            icon: [] as Array<Array<0 | 1>>,
            originalGrid: [] as Array<{ x:number, y:number, v:1|0, color: string }>,
            displayGrid: [] as Array<{ x:number, y:number, v:1|0, color: string }>,
            transitions: [] as Array<gsap.core.Tween>,
        }
    },
    computed: {
        svgWidth() {
            if (this.icon.length <= 0) {
                return 0
            }
            return this.icon.length * 10
        },
        svgHeight() {
            if (this.icon.length <= 0) {
                return 0
            }
            return this.icon[0].length * 10
        },
    },
    watch:{
        "size":{
            handler: function () {
                this.updateIcon()
            },
            immediate: true
        },
        "name":{
            handler: function () {
                this.updateIcon()
            },
            immediate: true
        },
        "activeColor": {
            handler: function () {
                this.updateIcon()
            },
            immediate: true
        },
        "custom":{
            handler: function () {
                if (!this.$el || typeof window === "undefined") {
                    return
                }
                
                if (this.custom && this.custom.length > 0) {
                    this.originalGrid = []
                    const activeColor =  this.activeColor ? this.activeColor : window.getComputedStyle(this.$el).color
                    const inactiveColor = this.inactiveColor ? this.inactiveColor : "rgba(153,153,153,.16)"
                    _.each(this.custom, (val) => {
                        const data = {
                            x: val.x,
                            y: val.y,
                            v: val.value,
                            color: val.value ? activeColor : inactiveColor
                        }
                        this.originalGrid.push(data)
                    })
                    this.transit({ duration: 0, delay: 0 })
                }
            },
            deep: true,
            immediate: true
        },
    },
    mounted() {
        this.updateIcon()
    },
    unmounted() {
        //
    },
    methods: {
        updateIcon() {
            
            
            if (!this.$el) {
                return
            }

            if (this.size && this.iconsMap[this.size] && typeof this.name === "string") {
                this.icon = this.iconsMap[this.size][this.name]
            }

            if (!this.icon) {
                throw new Error(`Invalid icon ${this.size}/${this.name}`)
            }
            
            this.originalGrid = []
            const activeColor =  this.activeColor ? this.activeColor : window.getComputedStyle(this.$el).color
            const inactiveColor = this.inactiveColor ? this.inactiveColor : "rgba(153,153,153,.16)"
            
            if (this.icon.length <= 0 && this.custom) {
                this.customGridToIcon()
            }

            _.each(this.icon, (row,y) => {
                _.each(row, (val,x) => {
                    const data = {
                        x,
                        y,
                        v: val,
                        color: val ? activeColor : inactiveColor
                    }
                    this.originalGrid.push(data)
                })
            })


            if (this.displayGrid.length !== this.originalGrid.length) {
                this.displayGrid = []
                _.each(this.originalGrid,(grid) => {
                    this.displayGrid.push({ 
                        x:grid.x,
                        y:grid.y,
                        v:grid.v,
                        color: grid.color 
                    })
                })
            }
                    
            this.transit(this.transitEffect)
        },
        customGridToIcon() {
            if (!this.custom) {
                console.warn("No custom grid to be transform to icon")
                return []
            }
            _.each(_.sortBy(this.custom, ["y", "x"]), point => {
                if (!this.icon[point.y]) {
                    this.icon.push([])
                }
                this.icon[point.y].push(point.value === 1 ? 1 : 0)
            })
        },
        transit(opts = {
            duration: .4,
            delay: 0,
            ease: "",
            effect: "" as "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top" | "shuffle"
        } as transitEffect) {

            if (this.transitions.length > 0) {
                _.each(this.transitions, t => {t.kill()})
                this.transitions = []
            }

            let effect = _.isString(opts.effect) ? opts.effect : "fade-in"
            let ease = _.isString(opts.ease) ? opts.ease : "linear"
            let duration = _.isNumber(opts.duration) ? opts.duration : .4
            let delay = _.isNumber(opts.delay) ? opts.delay : 0

            let collection = this.originalGrid
            if (effect == "shuffle") {
                collection = _.shuffle(this.originalGrid)
                if (!delay)  { delay = duration/2 / collection.length }
            } else if (effect == "top-to-bottom") {
                collection = this.originalGrid
                if (!delay)  { delay = duration/2 / collection.length }
            } else if (effect == "bottom-to-top") {
                collection = _.reverse(this.originalGrid)
                if (!delay)  { delay = duration/2 / collection.length }
            } else if (effect == "left-to-right") {
                collection = _.sortBy(this.originalGrid, "x")
                if (!delay)  { delay = duration/2 / collection.length }
            } else if (effect == "right-to-left") {
                collection = _.reverse(_.sortBy(this.originalGrid, "x"))
                if (!delay)  { delay = duration/2 / collection.length }
            } 

            
            _.each(collection, (grid, index) => {
                const cell = _.find(this.displayGrid, { x:grid.x, y:grid.y })
                if (cell) {
                    this.transitions.push(gsap.to(cell, {
                        color: grid.color,
                        ease: ease,
                        delay: Number(delay) * index,
                        duration
                    }))
                }
            })
        
                
        }
    }
})

</script>
