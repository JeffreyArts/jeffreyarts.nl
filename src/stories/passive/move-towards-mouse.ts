import gsap from "gsap"
import Story from "@/stories/_base"

class MoveTowardsMouse extends Story {
    type = "passive" as const
    mousePos = undefined as  { x: number, y: number } | undefined
    passiveOffset = 80 // replaced in start
    catterpillarMoveTimeout: ReturnType<typeof setTimeout> | undefined

    async start() {
        console.info("🦩 Move Towards Mouse story started")

        if (this.controller) {
            this.controller.ref.addpointerDownEvent(this.updateMousePosition.bind(this), "move-towards-mouse-story-update-mouse-position")
            this.controller.ref.addpointerMoveEvent(this.updateMousePosition.bind(this), "move-towards-mouse-story-update-mouse-position")

            if (this.catterpillar) {
                this.passiveOffset = this.catterpillar.length * this.catterpillar.thickness
            }
        }
    }

    updateMousePosition(pos: { x: number; y: number }) {
        this.mousePos = { ...pos }
        if (this.catterpillar ) {
            const dx = Math.abs(this.catterpillar.head.x - pos.x)
            if (dx < this.passiveOffset) {
                this.catterpillar.moveTowardsPoint = null
                return
            }
            this.catterpillar.moveTowards(pos)
        }

        return
    }

    get catterpillar() {
        return this.controller?.catterpillar
    }

    destroy = () => {
        console.info("📕 Missed You story finished")

        if (this.controller) {
            this.controller.ref.removepointerDownEvent("move-towards-mouse-story-update-mouse-position")
            this.controller.ref.removepointerMoveEvent("move-towards-mouse-story-update-mouse-position")
        }

        this.controller = undefined

        // Process the default story destroy
        super.destroy()
    }
}

export default MoveTowardsMouse