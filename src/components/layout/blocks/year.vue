<template>
        <div class="year-block" ref="year">
            
        </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import _ from "lodash"
import gsap from "gsap"
import { Icon } from "jao-icons"

export type YearBlock = {
    blockType: "year"
    size: number
    id: string
    year: string
}

export default defineComponent ({
    name: "yearBlock", 
    components: {},
    props: {
        options: {
            type: Object as PropType<YearBlock>,
            required: true
        },
    },
    data() {
        return {
            fadingIn: false,
        }
    },
    watch:{
        "options": {
            handler() {
                this.updateSVG()
                this.$emit("blockLoaded")
            },
            deep: true,
            immediate: true
        }
    },
    computed: {
        year() {
            if ( Number(this.options.year) < 0) {
                return Math.abs(Number(this.options.year)).toLocaleString('nl-NL') + "BC"
            }
            return this.options.year + ""
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
        this.updateSVG(false)
        window.addEventListener("layoutLoaded", this.layoutLoaded)
    },
    unmounted() {
        window.removeEventListener("layoutLoaded", this.layoutLoaded)
    },
    methods: {
        layoutLoaded(event: Event) {
            const customEvent = event as CustomEvent
            // traverse up the DOM tree to check the id of parent with classname layout-wrapper
            let parent = this.$el.parentElement
            while (parent) {
                if (parent.classList.contains("layout-wrapper")) {
                    break
                }
                parent = parent.parentElement
            }
            if (!parent) {
                return
            }

            if (customEvent.detail?.id === parent.id) {
                this.updateSVG(true)
            }
        },
        updateSVG(fadeIn = true) {
            let size = "small"
            if (window.innerWidth > 960) {
                size = "medium"
            }
            const svg = Icon(this.year, size)
            const targetEL = this.$refs["year"] as HTMLElement
              
            if (!svg) {
                throw new Error(`Can not create icon for number ${this.year}`)
            }
            if (!targetEL) {
                return
            }

            const oldSVG = targetEL.querySelectorAll("svg")
            if (oldSVG) {
                oldSVG.forEach(old => old.remove())
            }

            targetEL.appendChild(svg)
            if (fadeIn) {
                if (this.fadingIn) {
                    return
                }
                this.fadingIn = true
                setTimeout(() => {
                    const v0 = this.$el.querySelector("rect[v='0']")
                    const v1 = this.$el.querySelector("rect[v='1']")
                    if (!v0 || !v1) {
                        return
                    }

                    const colorV1 = window.getComputedStyle( v1 ).fill
                    const colorV0 = window.getComputedStyle( v0).fill
                    const rects = this.$el.querySelectorAll("rect")
                    let res = _.map(rects, rect => {
                        const val = parseInt(rect.getAttribute("v"), 10)
                        rect.setAttribute("v", "0")
                        return {
                            el: rect,
                            v:  val,
                        }
                    })

                    res = _.shuffle(res)
                    _.each(res, (obj, i) => {
                        let color = colorV0
                        if (obj.v === 1) {
                            color = colorV1
                        }

                        gsap.to(obj.el, {
                            duration:.54,
                            delay: 0.4 + 0.0032*i,
                            fill: color,
                            onComplete: () => {
                                obj.el.setAttribute("v", obj.v.toString())
                            }
                        })
                    })
                    setTimeout(() => {
                        this.fadingIn = false
                    }, (res.length * 0.0032 + 0.54 + 0.4) * 1000)
                })
            }
        }
    }
})

</script>

<style lang="scss">

.year-block {
    display: flex;
    justify-content: left;
    align-items: end;

    svg {
        height: 80px;
        rect[v="0"] {
            fill: transparent;
        }
    }
}

@media all and (min-width: 960px) {

    .year-block {
        svg {
            height: 128px;
        }
    }
    
}

</style>