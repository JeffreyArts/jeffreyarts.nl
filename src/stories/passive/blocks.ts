import Story from "@/stories/_base"
import BlockModel from "@/model/physics/block"
import router from "@/routes"
import Matter from "matter-js"

class BlocksStory extends Story {
    type = "passive" as const
    mousePos = undefined as  { x: number, y: number } | undefined
    debounceTimeout: ReturnType<typeof setTimeout> | undefined
    blocks = [] as Array<BlockModel> 

    async start() {
        console.info("🦩 Blocks story started")

        window.addEventListener("layoutChange", this.onLayoutHasChangedEventBind)
        document.addEventListener("scroll", this.onScrollBind)
        router.beforeEach((to, from, next) => {
            // Clean up blocks before navigating
            this.clearBlocks()
            
            next();
        });  
    }

    loop() {
        if (!this.controller?.catterpillar) return

        const catterpillar = this.controller.catterpillar
        const closestBlock = this.closestBlock
        
        if (closestBlock) {
            catterpillar.leftEye.lookAt(closestBlock, .5)
            catterpillar.rightEye.lookAt(closestBlock, .5)
        }
    }

    layoutHasChangedEvent()  {
        // Check if layout is loaded
        if (!document.querySelector(".layout.__isLoaded")) {
            return
        }

        // Clear any existing timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout)
        }

        // Set a new timeout
        this.debounceTimeout = setTimeout(() => {
            this.updateBlocks()
        }, 100) // 100ms debounce 
    }
    onLayoutHasChangedEventBind = this.layoutHasChangedEvent.bind(this)

    onScroll() {
        const contractions = this.catterpillar?.contraction
        if (contractions) {
            if (contractions.bellyConstraint) {
                this.catterpillar.unpin(contractions.bellyConstraint)
                contractions.bellyConstraint = undefined
            }

            if (contractions.headConstraint) {
                this.catterpillar.unpin(contractions.headConstraint)
                contractions.headConstraint = undefined
            }
            
            if (contractions.buttConstraint) {
                this.catterpillar.unpin(contractions.buttConstraint)
                contractions.buttConstraint = undefined
            }
        }
    }
    onScrollBind = this.onScroll.bind(this)
        

    updateBlocks() {
        const elements = document.body.querySelectorAll(".block")

        elements.forEach((element: Element) => {
            if (!this.controller) return

            const el = element as HTMLElement
            const blockType = element.querySelector("[data-blocktype]")?.getAttribute("data-blocktype")

            const blockTypeList = [
                // "projectArticle",
                "image",
                "code",
                "iframe",
                "favorite",
                "banner",
                "pieceThumbnail",
                "projectThumbnail",
            ]

            if (!blockType) {
                return
            }

            // Do not add blocks that are not in the list
            if (!blockTypeList.includes(blockType)) {
                return
            }
            
            // Do not add blocks that are already added
            const matchedBlock = this.blocks.find(b => b.id === el.id)
            if (matchedBlock) {
                matchedBlock.updateEl(el)
                // console.log("Block already exists, updating element reference", el.id)
                return
            }
            
            const block = new BlockModel({
                el: el,
                id: el.id
            }, this.controller.ref.world as Matter.World)

            this.blocks.push(block)
        })
        // }, 500)
    }

    clearBlocks() {
        this.blocks.forEach(block => {
            block.destroy()
        })
        this.blocks = []
    }

    get catterpillar() {
        return this.controller?.catterpillar
    }

    get closestBlock() {
        if (!this.catterpillar || this.blocks.length === 0) {
            return undefined
        }

        const head = this.catterpillar.head
        let closestBlock = undefined as BlockModel | undefined
        let closestDistance = Infinity
        this.blocks.forEach(block => {
            const catterpillar = this.catterpillar
            const controller = this.controller//?.ref.viewportHeight 
            if (!catterpillar || !controller) return

            const height = controller.ref.renderer.options.height || window.innerHeight
            const distance = Math.sqrt((head.x - block.x) ** 2 + (head.y - block.y) ** 2)
            if (((catterpillar.isPointingLeft() && block.x < catterpillar.x) ||
                (catterpillar.isPointingRight() && block.x > catterpillar.x))
                && block.y > 0 && block.y < height
            ) {
                if (distance < closestDistance) {
                    closestDistance = distance
                    closestBlock = block
                }
            }
        })
        return closestBlock
    }


    destroy = () => {
        console.info("📕 Missed You story finished")

        if (this.controller) {
            this.controller.ref.removepointerDownEvent("move-towards-mouse-story-update-mouse-position")
            this.controller.ref.removepointerMoveEvent("move-towards-mouse-story-update-mouse-position")
        }

        window.removeEventListener("layoutChange", this.onLayoutHasChangedEventBind)
        document.removeEventListener("scroll", this.onScrollBind)

        // Process the default story destroy
        super.destroy()
    }
}

export default BlocksStory