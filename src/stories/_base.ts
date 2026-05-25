import { MatterController } from "@/model/physics/controller"
import StoryStore from "@/stores/story"
import identityStore from "@/stores/identity"


class Story {
    type = undefined as "passive" | "conditional" | undefined
    priority = "low" as "low" | "medium" | "high"
    controller: MatterController | undefined
    storyStore: ReturnType<typeof StoryStore> | undefined
    identityStore: ReturnType<typeof identityStore> | undefined

    isDestroyed: boolean = false
    isAvailable: boolean = true

    constructor(controller: MatterController, silent = false) {
        this.controller = controller
        this.storyStore = StoryStore()
        this.identityStore = identityStore()

        // Silent is used to prevent the story from fully starting, but just initiate the stores & controller
        if (silent) {
            return
        }

        setTimeout(() => {
            this.start()
            this.#loop()
        })
    }

    #loop() {
        if (this.isDestroyed) {
            return
        }

        this.loop()
        requestAnimationFrame(() => {
            this.#loop()
        })
    }

    loop() {
    }

    async checkCondition() {
        return false
    }

    start() {

    }

    destroy() {
        this.isDestroyed = true
        this.controller = undefined
        this.storyStore = undefined
    }
}

export default Story