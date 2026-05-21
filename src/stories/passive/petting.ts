import Matter from "matter-js"
import Story from "@/stories/_base"
import Catterpillar from "@/model/catterpillar"
import type { currentIdentity } from "@/stores/identity"
import { collisionBrush } from "@/model/physics/collisions"

class PettingStory extends Story {
    type = "passive" as const
    identity = undefined as currentIdentity | undefined
    catterpillar = undefined as Catterpillar | undefined
    brush = undefined as Matter.Body | undefined
    maxLove = 10
    addedLove = 0
    addLove = 0

    // These 2 are used to detect movement
    xPos = 0
    prevXPos = 0

    async start() {
        console.info("🦩 Petting story started")
        if (!this.controller || !this.identityStore || !this.actionStore) return
        this.identity = this.identityStore.current
        
        this.controller.ref.addpointerDownEvent(this.createPetBrush.bind(this), "petting-story-create-brush")
        this.controller.ref.addpointerMoveEvent(this.updatePetBrushPosition.bind(this), "petting-story-move-brush")
        this.controller.ref.addpointerUpEvent(this.removePetBrush.bind(this), "petting-story-remove-brush")
        
        // const maxLoveArray = await this.actionStore.loadLastActionsFromDB(this.identity.id, "petting", this.maxLove)
        Matter.Events.on(this.controller.ref.engine, "collisionActive",this.#collisionEventListener)   
        
        // // remove all values that are older than 24 hours
        // const newMaxLoveArray = maxLoveArray.filter(action => {
        //     const twentyFourHours = 24 * 60 * 60 * 1000
        //     return (Date.now() - action.created) < twentyFourHours
        // })

        // this.maxLove = this.maxLove - newMaxLoveArray.length
    }


    #collisionEventListener = (event: Matter.IEventCollision<Matter.Engine>) => {
        event.pairs.forEach(pair => {
            let bodyPart: Matter.Body | undefined
            let brush: Matter.Body | undefined

            if (pair.bodyA.label.includes("bodyPart") && pair.bodyB.label === "brush") {
                bodyPart = pair.bodyA
                brush = pair.bodyB
            } else if (pair.bodyB.label.includes("bodyPart") && pair.bodyA.label === "brush") {
                bodyPart = pair.bodyB
                brush = pair.bodyA
            }

            if (!bodyPart || !brush) return

        })
    }

    #bodyPartMoveTowardsPoint(
        point: Matter.Vector,
        bodyPart: Matter.Body,
        baseForce = 0.0002
    ) {
        if (!this.catterpillar || !this.brush?.circleRadius) return
        
        const direction = Matter.Vector.sub(point, bodyPart.position)
        const distance = Matter.Vector.magnitude(direction)
        if (distance === 0) return
        if (distance > this.catterpillar.thickness + this.brush.circleRadius) return // don't apply force if too far

        const normalized = Matter.Vector.normalise(direction)

        // falloff
        const strength = baseForce * Math.min(distance / this.catterpillar.thickness, 1)

        if (this.addLove <= this.maxLove) {
            this.addLove += strength*5
        }

        Matter.Body.applyForce(
            bodyPart,
            bodyPart.position,
            Matter.Vector.mult(normalized, strength)
        )
    }

    loop() {
        if (!this.controller || !this.identityStore?.current) return
        this.catterpillar = this.controller.catterpillar
        
        const bodyParts = this.catterpillar.bodyParts
        
        if (!this.brush) return
        if (!this.catterpillar.isOnSolidGround) return

        if (this.addLove <= this.maxLove+1 && Math.floor(this.addLove) !== this.addedLove) {
            this.identityStore.current.love += Math.floor(this.addLove) - this.addedLove
            this.addedLove = Math.floor(this.addLove)
            // this.actionStore.add(this.identityStore.current.id, "petting", 1)
        }
                
        this.xPos = this.brush.position.x
        bodyParts.forEach(bodyPart => {
            if (this.prevXPos === this.xPos || !this.brush) return
            this.#bodyPartMoveTowardsPoint(this.brush.position, bodyPart.body, .0012)
        })
            
        this.prevXPos = this.xPos
    }
    
    updatePetBrushPosition(position: { x: number; y: number }) {
        if (!this.brush) return
        Matter.Body.setPosition(this.brush, position)
    }   

    removePetBrush() {
        if (!this.brush || !this.controller) return
        Matter.World.remove(this.controller.ref.world, this.brush)
        this.brush = undefined
    }

    createPetBrush(position: { x: number; y: number }) {
        if (!this.catterpillar || !this.controller) return

        // check if position is near a body part
        const bodyParts = this.catterpillar.bodyParts
        let nearBodyPart = false
        bodyParts.forEach(bodyPart => {
            if (!this.catterpillar) return

            const distance = Matter.Vector.magnitude(
                Matter.Vector.sub(bodyPart.body.position, position)
            )
            if (distance < this.catterpillar.thickness) {
                nearBodyPart = true
            }
        })
        if (nearBodyPart) return

        // Create matter circle
        this.brush = Matter.Bodies.circle(position.x, position.y, 30, {
            collisionFilter: collisionBrush,
            isSensor: true,
            isStatic: true,
            label: "brush",
            render: {
                fillStyle: "rgba(255, 192, 203, 0.5)",
                strokeStyle: "rgba(255, 192, 203, 1)",
                lineWidth: 2,
            }
        })
        Matter.World.add(this.controller.ref.world, this.brush)
    }

    destroy = () => {
        console.info("📕 Petting story finished")

        if (this.controller) {
            Matter.Events.off(this.controller.ref.engine, "collisionActive", this.#collisionEventListener)
            if (this.brush) {
                Matter.World.remove(this.controller.ref.world, this.brush)
            }

            this.controller.ref.removepointerDownEvent("petting-story-create-brush")
            this.controller.ref.removepointerMoveEvent("petting-story-move-brush")
            this.controller.ref.removepointerUpEvent("petting-story-remove-brush")
        }

        this.brush = undefined
        this.identity = undefined
        this.catterpillar = undefined


        // Process the default story destroy
        super.destroy()
    }
}

export default PettingStory