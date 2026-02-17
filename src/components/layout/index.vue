<template>
    <div class="layout-wrapper">

        <!-- firstLoad: {{ firstLoad }} -->
        <section  class="layout"
            :class="{
                '__isLoaded': loaded,
                '__isProcessing': processing
            }"
            v-if="options && blocks.length > 0"
            :layout-size="options.layoutSize"
            :layout-gap="options.layoutGap">
            
            <!-- <div class="layout-loader"> -->
            <div class="layout-loader" v-if="!loaded || processing">
                <h6>Loading...</h6>
                <span v-if="!processing">
                    {{newBlocks.length }} / {{ blocks.length }}
                </span>
            </div>

            <Block v-for="block,key in blocks" :key="key" @blockLoaded="blockLoaded(block)"
                class="__isFixed"
                :id="`block-${block.id}`"
                :size="block.size" 
                :data="block.data"
                :class="{
                    '__isLoaded' : block.loaded,
                    '__isFadedIn': block.fadedIn
                }"
                :style="{
                    width: calculatePos('width', block.id),
                    top: calculatePos('y', block.id),
                    left: calculatePos('x', block.id),
                }">
            </Block>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType, nextTick } from "vue"
import _ from "lodash"
import Packer, { Position, Block } from "@/model/packer"
import gsap from "gsap"
import BlockComponent from "./blocks/index.vue"
import { BlockType, LayoutOptions } from "./layout-types"

type newBlock = {
    el?: HTMLElement,
    block: BlockType,
    packerBlock: Block,
    position: Position,
}


export default defineComponent ({
    name: "LayoutComponent", 
    components: {
        Block: BlockComponent,
    },
    props: {
        options: {
            type: Object as PropType<LayoutOptions>,
            required: true
        },
    },
    data() {
        return {
            blockAddedTimeout: undefined as undefined | NodeJS.Timeout,
            timeoutDelay: undefined as undefined | NodeJS.Timeout,
            updateAllBlocksTimeout: undefined as undefined | NodeJS.Timeout,
            layoutWidth: 0 as number,
            layoutSizeRatio: 0 as number,
            packerLayout: undefined as Packer | undefined,
            firstLoad: true,
            loaded: false,
            processing: false,
            newBlocks: [] as newBlock[],
            blocks: [] as BlockType[],
            sortedBlocks: [] as Position[],
        }
    },
    computed: {
    },
    watch:{
        "$route.path": {
            handler() {
                this.firstLoad = true
                this.loaded = false
                this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })
                if (this.updateAllBlocksTimeout) {
                    clearTimeout(this.updateAllBlocksTimeout)
                }
            },
            immediate: false
        },
        "options.blocks": {
            handler(blocks) {
                if (blocks.length <= 0) {
                    return
                }
                
                this.addBlocks(this.options.blocks)
            },
            deep: true,
            immediate: true // Cause if will first be an empty array, than it will be filled with blocks
        },
    },
    mounted() {
        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.__onResizeEvent)
        }
    },
    unmounted() {
        window.removeEventListener("resize", this.__onResizeEvent)
    },
    methods: {
        __onResizeEvent() { 
            clearTimeout(this.timeoutDelay)
            gsap.set(this.$el.querySelectorAll(".block"), {opacity: 0})
            this.timeoutDelay = setTimeout(this.updateAllBlockPositions, 100)
        },
        calculatePos(type: "width" | "x" | "y", blockId: string | number) {
            const position = this.newBlocks.find(b => b.block.id === blockId)?.position
            if (!position) {
                return
            }
            
            if (isNaN(position[type])) {
                if (type === "width") {
                    return "100%"
                }
                return "auto"
            }
            return `${position[type]}px`
        },
        addBlocks(newBlocks: BlockType[]){
            newBlocks.forEach(block => {
                const blockExists = this.blocks.find(b => block.id === b.id)
                if (blockExists) { return  }
                
                // This way of adding the block removes the link with the original block in options.blocks, 
                // which prevents the options.blocks deep watcher from triggering unnecessary
                this.blocks.push({...block})
            })

            this.blocks.forEach((block, index) => {
                block.position = index
            })
        },
        addBlockToPacker(id: string, onlyWidth = false) {
            const newBlock = this.newBlocks.find(b => b.block.id == id)
            const blockEl = this.$el.querySelector(`#block-${id}`) as HTMLElement
            
            if (!newBlock) {
                console.error(`Can not find newBlock with id ${id}`)
                return 
            }

            if (!this.packerLayout) {
                this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })
            }

            if (blockEl) {

                const size = newBlock.block.size > this.options.layoutSize ? this.options.layoutSize : newBlock.block.size
                const ratio = blockEl.clientWidth  / blockEl.clientHeight
                const width = size * this.layoutSizeRatio
                const height = width / ratio
                
                newBlock.packerBlock.width = Math.floor(width)
                newBlock.packerBlock.height = Math.floor(height)

                // Check if block is already in packer layout
                const alreadyInPacker = this.packerLayout.blocks.find(b => b.id === newBlock.packerBlock.id)
                let position
                

                if (!alreadyInPacker) {
                    position = this.packerLayout.addBlock(newBlock.packerBlock, 12) as Position
                } else {
                    position = {
                        width: onlyWidth ? newBlock.packerBlock.width : alreadyInPacker.width,
                        height: onlyWidth ? alreadyInPacker.height : newBlock.packerBlock.height,
                        position: alreadyInPacker.position,
                        x: newBlock.position.x,
                        y: newBlock.position.y,
                    }
                }

                if (onlyWidth) {
                    newBlock.position = {
                        height: NaN,
                        width: position.width,
                        x: 0,
                        y: 0
                    }
                } else {
                    newBlock.position = position
                }
            } else {
                console.error("Missing block element for block id:", newBlock.block.id)
            }
        },
        async updateAllBlockPositions() {
            if (!this.$el) {
                return
            }

            const ONLY_WIDTH = true

            // Set helper variables
            this.layoutWidth = this.$el.clientWidth
            this.layoutSizeRatio = (this.layoutWidth) / this.options.layoutSize

            this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })

            // Sort by position
            this.newBlocks.sort((a, b) => { 
                if (a.position?.position === undefined) return 1;
                if (b.position?.position === undefined) return -1;
                return a.position.position - b.position.position;
            });

            // Set all the correct widths
            this.newBlocks.forEach(newBlock => {
                this.addBlockToPacker(newBlock.block.id, ONLY_WIDTH)
            })
            
            dispatchEvent(new CustomEvent('layoutChange'))   

            const complicatedBlockTypes = ["ascii", "line", "banner", "pieceThumbnail", "note" ]
            let delay = 1000
            const hasComplicatedBlock = this.newBlocks.some( b => complicatedBlockTypes.includes(b.block.data.blockType) );
            if (!hasComplicatedBlock) {
                delay = 100
            }

            // Set all the correct heights after 1 second, to give some time to any block that needs to update because the width has changed
            this.updateAllBlocksTimeout = setTimeout(() => {
                this.updateAllBlocksTimeout = undefined
                this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })
                
                this.newBlocks.forEach(newBlock => {
                    this.addBlockToPacker(newBlock.block.id)
                })

                this.updateLayoutHeight()
                this.fadeInNewBlocks()

                // Communicate that the layout has been loaded
                this.loaded = true
                this.$emit("loaded", this.loaded)
                dispatchEvent(new CustomEvent('layoutLoaded', { detail: this.options }))   
            }, delay)

            gsap.to(".layout-loader", {
                opacity: 0,
                duration: delay ? .5 : 0,
                delay: delay ? .5 : 0,
                ease: "sine.out",
            })
        },
        async addNewBlockPositions() {
            if (!this.$el) {
                return
            }
            const ONLY_WIDTH = true

            // Set helper variables
            this.layoutWidth = this.$el.clientWidth
            this.layoutSizeRatio = (this.layoutWidth) / this.options.layoutSize

            // Sort by position
            this.newBlocks.sort((a, b) => { 
                if (a.position?.position === undefined) return 1;
                if (b.position?.position === undefined) return -1;
                
                return a.position.position - b.position.position
            });
            

            // Set all the correct widths
            this.newBlocks.forEach(newBlock => {
                // If there is already a domElement connected, it is not really new and can be skipped
                if (newBlock.el?.classList.contains("__isFadedIn")) {
                    return
                }

                this.addBlockToPacker(newBlock.block.id, ONLY_WIDTH)
            })
            
            this.updateLayoutHeight()

            const complicatedBlockTypes = ["ascii", "line", "banner", "pieceThumbnail", "note" ]
            let delay = 1000
            const hasComplicatedBlock = this.newBlocks.some( b => complicatedBlockTypes.includes(b.block.data.blockType) );
            if (!hasComplicatedBlock) {
                delay = 0
            }

            setTimeout(() => {
                this.newBlocks.forEach(newBlock => {
                    // If there is already a domElement connected, it is not really new and can be skipped
                    if (newBlock.el?.style.opacity === "1") {
                        return
                    }

                    // Re-calculate width and height, (especially the height)
                    const blockEl = newBlock.el as HTMLElement
                    const size = newBlock.block.size > this.options.layoutSize ? this.options.layoutSize : newBlock.block.size
                    const ratio = blockEl.clientWidth  / blockEl.clientHeight
                    const width = size * this.layoutSizeRatio
                    const height = width / ratio
                    
                    newBlock.packerBlock.width = Math.floor(width)
                    newBlock.packerBlock.height = Math.floor(height)

                    this.packerLayout?.updateBlock(newBlock.packerBlock)
                })
                if (!this.packerLayout) {
                    console.error("Packer layout is not defined")
                    return
                }

                // Manually trigger a layout update 
                const newPositions = this.packerLayout.updateLayout(12, (Math.round(this.newBlocks.length / 16) - 1) * 16)

                newPositions.forEach(newPos => {
                    const blockId = newPos.id as string | number
                    let block = this.newBlocks.find(b => b.block.id === blockId)

                    if (!block) {
                        throw new Error("Invalid blockId ")
                    }

                    block.position = {
                        ...newPos,
                        position: block.position.position
                    }
                })
                
                // A bit shady solution but it works
                this.loaded = true

                this.fadeInNewBlocks()
                this.updateLayoutHeight()
            }, 250)
        },
        async blockLoaded(block: BlockType) {
            if (block.loaded) {
                return
            }   
            block.loaded = true
            this.updateLayoutWidth()
                        
            // Add the loaded block to the newBlocks array
            this.newBlocks.push({
                el: undefined,
                block: block,
                packerBlock: {
                    id: block.id,
                    width: NaN,
                    height: NaN,
                    position: block.position
                },
                position: {
                    x: 0,
                    y: 0,
                    width: block.size * this.layoutSizeRatio,
                    height: NaN,
                    position: block.position
                }
            })
            
            // if all blocks are loaded, set their dimensions and positions
            if (this.blocks.every(block => block.loaded)) {
                // Update the connected domElements with the newBlocks, now they are all loaded
                this.newBlocks.forEach(b => {
                    const blockEl = this.$el.querySelector(`#block-${b.block.id}`) as HTMLElement
                    b.position.width = b.block.size * this.layoutSizeRatio,
                    b.el = blockEl
                })
                

                if (this.firstLoad) {
                    this.updateAllBlockPositions()  
                } else {
                    this.addNewBlockPositions()
                }
                    
                this.firstLoad = false
            }
        },
        fadeInNewBlocks() {
            dispatchEvent(new CustomEvent('layoutChange'))   

            const newBlocks = this.newBlocks.map(b => b)
            newBlocks.sort((a, b) => {
                // Eerst sorteren op y (van boven naar beneden)
                if (a.position.y !== b.position.y) {
                    return a.position.y - b.position.y;
                }
                // Als y gelijk is, sorteren op x (van links naar rechts)
                return a.position.x - b.position.x;
            });

            let cumulativeDelay = 0;
            let countIndex = 0
            newBlocks.forEach((newBlock, index) => {
                if (newBlock.el && newBlock.el.style.opacity !== "1") {
                    // Stapgrootte wordt steeds kleiner, maar delay neemt altijd toe
                    const step = Math.max(0.2 - (countIndex * 0.02), 0.01);
                    cumulativeDelay += step;
                    gsap.to(newBlock.el, {
                        opacity: 1,
                        duration: 0.24,
                        delay: cumulativeDelay,
                        ease: "sine.out",
                        onComplete: () => {
                            newBlock.block.fadedIn = true
                            if (this.blocks.every(b => b.fadedIn) ) {
                                window.dispatchEvent(new CustomEvent('layoutChange'))   
                                window.dispatchEvent(new CustomEvent("blocksFadedIn"))
                            }
                        }
                    });
                    countIndex++
                }
            });
            
        },
        updateLayoutWidth() {
            if(!this.$el){
                return
            }
            this.layoutWidth = this.$el.clientWidth
            this.layoutSizeRatio = (this.layoutWidth) / this.options.layoutSize
        },
        updateLayoutHeight() {
            if (!this.$el) {
                console.warn("Can not call updateLayout when this.$el has not yet been set")
                return
            }
        
            const layout = this.$el.querySelector(".layout")
            
            if (!layout) { return }
            if (this.newBlocks.length != this.blocks.length) { return }

            // Get last block
            let lastBlock = this.newBlocks[0]
            this.newBlocks.forEach(newBlock => {
                if (newBlock.position.y + newBlock.position.height > lastBlock.position.y + lastBlock.position.height) {
                    lastBlock = newBlock
                }
            })

            if (!lastBlock) {
                return
            }
             
            // Set layout height to the bottom of the last block
            gsap.to(layout, {
                height: `${Number(lastBlock.position.height) + Number(lastBlock.position.y)}px`,
                duration: 0.5,
                ease: "sine.out",
                onComplete: () => {
                    dispatchEvent(new CustomEvent("layoutChange"))
                }
            })
        },
    }
})

</script>

<style lang="scss">
@use './../../assets/scss/variables.scss';
.layout-wrapper {
    display: block;
    width: 100vw;
}

.layout {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    overflow-x: hidden;
    overflow-y: hidden;

    .block {
        opacity: 0;
    }
}

.layout-loader {
    width: 100%;
    min-height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
    position: relative;
    font-family: var(--accent-font);
    gap: 8px;
    pointer-events: none;

    h6 {
        font-size: 16px;
        font-weight: 400;
        margin: 0;
    }


    span {
        font-size: 14px;
    }
}


</style>