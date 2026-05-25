import Matter from "matter-js"
import Story from "@/stories/_base"
import { type Emote } from "@/model/catterpillar"

class WallSlamStory extends Story {
    type = "passive" as const
    collisionHandler = undefined as ((event: Matter.IEventCollision<Matter.Engine>) => void) | undefined
    defaultState = "happy" as Emote
    defaultStateTimeout = undefined as ReturnType<typeof setTimeout> | undefined
    isHurt = false
    isDestroyed = false
    
    start() {
        console.info("🦩 Wall Slam story started")
        if (!this.controller?.catterpillar) return
        
        this.defaultState = this.controller.catterpillar.defaultState
        setTimeout(() => {
            if (!this.controller) return
        
            Matter.Events.on(this.controller.ref.engine, "collisionStart",this.checkForCollision)
        })
    }
    
    get catterpillar() {
        return this.controller?.catterpillar
    }
 
    checkForCollision = (event: Matter.IEventCollision<Matter.Engine>) =>{
        event.pairs.forEach((pair) => {
            // Check of dit pair je head bevat
            if (!this.controller || !this.identityStore?.current) {
                return
            }
            if (!this.catterpillar) return

            const head = this.catterpillar.head.body
            if (pair.bodyA.label === head.label || pair.bodyB.label === head.label) {

                // Bepaal welke body de head is en welke de ander
                const other = (pair.bodyA.label === head.label) ? pair.bodyB : pair.bodyA
                const normal = pair.collision.normal

                // Relatieve snelheid langs normaal
                const relVel = {
                    x: other.velocity.x - head.velocity.x,
                    y: other.velocity.y - head.velocity.y
                }
                const vRelAlongNormal = relVel.x * normal.x + relVel.y * normal.y

                const impactScore = Math.abs(vRelAlongNormal)

                if (impactScore > 24) {
                    const currentId = this.identityStore.current?.id
                    if (!currentId) return
                    
                    this.catterpillar.defaultState = "sad"
                    this.isHurt = true
                 
                    if (this.defaultStateTimeout) {
                        clearTimeout(this.defaultStateTimeout)
                    }
                 
                    this.defaultStateTimeout = setTimeout(() => {
                        if (!this.controller || !this.identityStore?.current || !this.catterpillar) return
                        this.identityStore.setDefaultEmotionalState()
                        this.catterpillar.defaultState = this.identityStore.current.defaultState as Emote
                        this.catterpillar.emote(this.catterpillar.defaultState)
                        this.isHurt = false
                    }, 10000)
                }
            }
        })
    }

    destroy = () => {
        console.info("📕 Wall Slam story finished")
        if (this.controller) {
            Matter.Events.off(this.controller.ref.engine, "collisionStart",this.collisionHandler)
        }

        this.isDestroyed = true

        // Process the default story destroy
        super.destroy()
    }
}

export default WallSlamStory