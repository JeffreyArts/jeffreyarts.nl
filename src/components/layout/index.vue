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
            <div class="layout-loader" v-if="!loaded">
                <h6>Loading...</h6>
                <span>
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
            timeoutDelay: undefined as undefined | NodeJS.Timeout,
            gap: 40,
            animations: [] as gsap.core.Tween[],
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
        // "$route.path": {
        //     handler() {
        //         this.firstLoad = true
        //     },
        //     immediate: false
        // },
        "options.layoutSize": {
            async handler() {
                // this.updateAllBlockPositions()
            },
            immediate: true
        },
        "options.blocks": {
            handler(blocks) {
                if (blocks.length <= 0) {
                    return
                }
                this.loaded = false
                
                if (this.animations) {
                    this.animations.forEach(tween => {
                        gsap.killTweensOf(tween)
                    })
                }

                this.addBlocks(this.options.blocks)
            },
            deep:false,
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
        // __findBlock(blockId: string | number, targetBlocks: BlockType[]) {
        //     if (!blockId)  throw new Error("Missing id in posBlock")

        //     let foundBlock = undefined
        //     if (typeof blockId === "number") {
        //         foundBlock = targetBlocks[blockId] as BlockType | undefined
        //     } else if (typeof blockId === "string") {
        //         foundBlock = _.find(targetBlocks, { id: blockId }) as BlockType | undefined
        //     }
        //     return foundBlock
        // },
        // __updateLayoutHeight() {
        //     if (!this.$el) {
        //         return
        //     }

        //     const layout = this.$el.querySelector(".layout")

        //     if (!layout) {
        //         return
        //     }
            
        //     const lastBlock = _.maxBy(this.blocks, block => Number(block.height) + Number(block.y))
        //     if (!lastBlock) {
        //         return
        //     }
             
        //     layout.style.height = `${Number(lastBlock.height) + Number(lastBlock.y)}px`

        //     dispatchEvent(new CustomEvent("layoutChange"))
            
        // },
        //  async __setBlockDimensions(blocks: Array<newBlock>){
        //     const result = [] as Array<Promise<void>>
        //     // Set block width + height
        //     blocks.forEach((b) => {
        //         const block = b.block
        //         if (!block.width || !block.height) {
        //             block.width = b.el.clientWidth
        //             block.height = b.el.clientHeight
        //         }
        //         const ratio = block.width / block.height
        //         b.width = block.size * this.layoutSizeRatio
        //         b.height = b.width / ratio
        //         console.log("Block", block)
        //     })
        //     // _.each(blocks, (b) => {
        //     //     result.push(new Promise((resolve): void => {
        //     //         const block = b.block
        //     //         // const originalBlock = _.find(this.options.blocks, { id: block.id })
        //     //         // if (!originalBlock) {
        //     //         //     return
        //     //         //     // throw new Error("Missing original reference")
        //     //         // }
                    
        //     //         // block.size = block.size > this.options.layoutSize ? this.options.layoutSize : block.size
        //     //         const ratio = b.width / b.height
        //     //         b.width = block.size * this.layoutSizeRatio
        //     //         b.height = b.width / ratio
                    
                    
        //     //         // setTimeout(() => {
        //     //         //     const targetBlock = this.$el.querySelector(`#block-${block.id}`)
        //     //         //     console.log("Setting block dimensions for", targetBlock)   
                        
        //     //         //     if (!targetBlock) {
        //     //         //         return
        //     //         //     }
                        
        //     //         //     const blockStyle = window.getComputedStyle(targetBlock)
                        
        //     //         //     if (blockStyle) {
        //     //         //         // block.height = parseInt(blockStyle.height)
        //     //         //     }
        //     //         //     resolve()
                            
        //     //         // })
        //     //     }))
        //     // })
            
        //     // await Promise.all(result)
        //     return blocks
        // },
        // async redrawBlocks() {
        //     this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })
        //     await this.updateBlockSizes()
        //     // this.updateBlockSizes()
        // },
        // async addNewBlocks() {
        //     this.processing = true
        //     dispatchEvent(new CustomEvent("layoutChange"))
        //     // this.updateLayoutDimensions();
        //     if (!this.packerLayout) { return }
        //     const block = this.newBlocks[0]
        //     const newBlock = {  
        //         width: block.width || 0,
        //         height: parseInt(block.height?.toString() || "0"),
        //         position: this.blocks.length,
        //         id: block.id
        //     }
            
        //     const result = await this.packerLayout.addBlock(newBlock, 12);
            
        //     if (result) {
        //         this.newBlocks = this.newBlocks.filter(b => b.id !== block.id)
        //         // Update this.block with new position (match by id)
        //         const index = this.blocks.findIndex(b => b.id === block.id)
        //         if (index !== -1) {
        //             this.blocks[index] = {
        //                 ...this.blocks[index],
        //                 x: result.x,
        //                 y: result.y,
        //                 width: result.width,
        //                 height: result.height
        //             }
        //         }
        //     }

        //     if (this.newBlocks.length > 0) {
        //         this.addNewBlocks()
        //     } else {
        //         this.__updateLayoutHeight()
        //         this.processing = false
        //     }
        // },
        calculatePos(type: "width" | "height" | "x" | "y", blockId: string | number) {
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
            if (this.newBlocks.length == 0) {
                this.firstLoad = true
            } else {
                this.firstLoad = false
            }

            newBlocks.forEach(block => {
                const blockExists = this.blocks.find(b => block.id === b.id)
                if (blockExists) { return  }
                
                this.blocks.push(block)
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
                // newBlock.el = blockEl

                const size = newBlock.block.size > this.options.layoutSize ? this.options.layoutSize : newBlock.block.size
                const ratio = blockEl.clientWidth  / blockEl.clientHeight
                const width = size * this.layoutSizeRatio
                const height = width / ratio
                
                newBlock.packerBlock.width = Math.floor(width)
                newBlock.packerBlock.height = Math.floor(height)
                const position = this.packerLayout.addBlock(newBlock.packerBlock, 12) as Position
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
                delay = 0
            }

            // Set all the correct heights after 1 second, to give some time to any block that needs to update because the width has changed
            setTimeout(() => {
                this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })
                
                this.newBlocks.forEach(newBlock => {
                    this.addBlockToPacker(newBlock.block.id)
                })

                dispatchEvent(new CustomEvent('layoutChange'))   
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
                if (newBlock.el) {
                    return
                }
                this.addBlockToPacker(newBlock.block.id)
            })
            dispatchEvent(new CustomEvent('layoutChange'))   
            this.updateLayoutHeight()
            
            this.fadeInNewBlocks()

            // Bit shady to not update height second time, but shouldn't be necessary cause the blocks that use this feature don't have such requirement (for now)
            setTimeout(() => {
                this.updateLayoutHeight()
            }, 500)
        },
        async blockLoaded(block: BlockType) {
            if (block.loaded) {
                return
            }   
            block.loaded = true
            this.updateLayoutWidth()
            // Get index of block in this.blocks
            const index = this.blocks.findIndex(b => b.id === block.id)
            
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
                    position: index
                }
            })
            
            // if all blocks are loaded, set their dimensions and positions
            if (this.blocks.every(block => block.loaded)) {
                if (this.firstLoad) {
                    // Update the connected domElements with the newBlocks, now they are all loaded
                    this.newBlocks.forEach(b => {
                        const blockEl = this.$el.querySelector(`#block-${b.block.id}`) as HTMLElement
                        b.position.width = b.block.size * this.layoutSizeRatio,
                        b.el = blockEl
                    })

                    this.updateAllBlockPositions()  
                } else {
                    this.addNewBlockPositions()
                }
            }
        },
        fadeInNewBlocks() {
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
            newBlocks.forEach((newBlock, index) => {
                if (newBlock.el) {
                    // Stapgrootte wordt steeds kleiner, maar delay neemt altijd toe
                    const step = Math.max(0.2 - (index * 0.02), 0.01);
                    cumulativeDelay += step;
                    gsap.to(newBlock.el, {
                        opacity: 1,
                        duration: 0.24,
                        delay: cumulativeDelay,
                        ease: "sine.out",
                    });
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

            // Set these mandatory variables, required for other parts of the component
            // this.layoutWidth = this.$el.clientWidth
            // this.layoutSizeRatio = (this.layoutWidth) / this.options.layoutSize
        
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
             
            layout.style.height = `${Number(lastBlock.position.height) + Number(lastBlock.position.y)}px`
            dispatchEvent(new CustomEvent("layoutChange"))
        },
        // updateBlockSizes() {
        //     return new Promise(async (resolve) => {
        //         console.log("Updating block sizes")
        //         // // this.packerLayout = undefined
        //         // this.updateLayout()
            
        //         const blocks = this.blocks
        //         await this.__setBlockDimensions(blocks)
        //         console.log("Block dimensions set", blocks)
        //         setTimeout(async () => {
        //             // await this.__setBlockDimensions(blocks)

        //             // Convert height(:auto) to number to match setBlocks
        //             // Re-position blocks according their default order to unshuffle setBlocks result
        //             const convertedBlocks = _.orderBy(blocks.map(block => {
        //                 if (typeof block.height === "undefined") {
        //                     block.height = 0
        //                 }
                        
        //                 if (typeof block.height === "string") {
        //                     block.height = parseFloat(block.height)
        //                 }
                        
        //                 return {
        //                     id: block.id,
        //                     position: block.position,
        //                     width: block.width || 0,
        //                     height: block.height
        //                 }
        //             }), "position")
                    
                    
        //             if (!this.packerLayout) {
        //                 this.packerLayout = new Packer(this.layoutWidth, 0, { autoResize: "height" })
        //             }
        //             this.sortedBlocks = this.packerLayout.setBlocks(convertedBlocks, 12)
                    
                    
        //             if (this.sortedBlocks) {
        //                 _.each(this.sortedBlocks, (posBlock) => {
        //                     const blockId = posBlock.id as string | number
        //                     let block = this.__findBlock(blockId, blocks)

        //                     if (!block) {
        //                         throw new Error("Invalid blockId ")
        //                     }
        //                     block.width = posBlock.width
        //                     block.height = posBlock.height
        //                     block.y = posBlock.y
        //                     block.x = posBlock.x
        //                 })
        //             }   

        //             setTimeout(() => {
        //                 this.__updateLayoutHeight()
        //             }, 0)

        //             requestAnimationFrame(resolve)
        //         }, 10)
        //     })
        // },
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