<template>
    
    <div id="matter-box">
        
        <!-- Matter container -->
        <section id="catterpillar" ref="catterpillar"></section>
    </div>
</template>



<script lang="ts">
import {defineComponent, type PropType} from "vue"
import { MatterController } from "@/model/physics/controller"
import { textureInterface } from "@/assets/default-textures"
import { gsap } from "gsap"
import _ from "lodash"
import jaoIcon from "./jao-icon.vue"

import useStoryStore from "@/stores/story";
import useIdentityStore from "@/stores/identity"

type currentIdentity = {
    id: number
    name: string
    gender: number // 0-1
    primaryColor: string
    secondaryColor: string
    textureIndex: number;       // 0-1023
    colorSchemeIndex: number;   // 0-1023
    offset: number
    texture: textureInterface
    origin: string
    age: number,
    created: number,
    death: number | undefined
    length: number
    thickness: number
    cooldown: number
    hunger: number
    joy: number
    love: number
    defaultState?: "happy" | "sad" | "hmm"
}


export default defineComponent ({ 
    props: {
        identity: {
            type: Object as PropType<currentIdentity>,
                required: true
            }
        },
        components: {
            jaoIcon
        },
        data() {
            return {
                controller: null as MatterController | null,
                // clickType: null as string | null,
                dev: true,
            }
        },
        watch: {
            // "identity.defaultState"(newVal, oldVal) {
            //     if (!newVal || !this.controller) {
            //         return
            //     }
            //     this.controller.catterpillar.defaultState = newVal
            //     this.controller.catterpillar.emote(newVal)
            // },
            "identity.id": {
                handler() {
                    this.addCatterpillar()
                    this.start()
                },
                immediate: true
            },
        },
        setup() {
            const identityStore = useIdentityStore()
            const storyStore = useStoryStore()
            return {
                identityStore: identityStore,
                storyStore: storyStore
            }
        },
        async mounted() {
            
            // let startPosition = { x: this.ref.renderer.options.width / 2, y: this.ref.renderer.options.height - this.config.offsetBottom - catterpillarOptions.identity.thickness }
            const offsetBottom = 0
            const startPosition = { 
                x: window.innerWidth / 2,
                y: window.innerHeight - offsetBottom - this.identity.thickness 
            }
            
            this.controller = new MatterController( this.$refs["catterpillar"] as HTMLElement, {
                identity: this.identity,
                catterpillarPos: startPosition,
                offsetBottom: 2
            })
            this.addCatterpillar()
        },
        unmounted() {
            if (this.controller) {
                this.controller.destroy()
                this.controller = null
            }
        },
        methods: {
            async start() {
                await this.storyStore.initialised
                // Check queryparam for ?dev 
                if (window.location.search.includes("dev")) {
                    this.toggleDevMode()
                }

                await this.storyStore.updateConditionalStories()
                
                console.info("=== 🦩 Starting passive stories ===")
                
                await this.storyStore.setActiveStory("wall-slam")
                await this.storyStore.setActiveStory("petting")
                await this.storyStore.setActiveStory("move-towards-mouse")
                await this.storyStore.setActiveStory("blocks")
                // await this.storyStore.setActiveStory("covidstar-painting")

                setTimeout(() => {
                    console.info("================================")
                    console.info("")
                })
            },
            addCatterpillar() {
                if (this.controller) {
                    const width = this.controller.ref.renderer.options.width || 100
                    
                    this.controller.catterpillar.destroy()
                    this.controller.createCatterpillar({ x: width / 2, y: 0 }, { identity: this.identity })  
                }
            },
            toggleDevMode() {
                this.dev = !this.dev
                const twoEl = this.$el.querySelector("[id^='two-js']") as HTMLCanvasElement
                const rendererEl = this.$el.querySelector("#matter") as HTMLCanvasElement
                gsap.to(twoEl, {duration: 0.3, opacity: this.dev ? 0 : 1})
                gsap.to(rendererEl, {duration: 0.3, opacity: this.dev ? 1 : 0})
            }
        }
    })
</script>


<style> 
#matter-box {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1990;

    #matter {
        opacity: 0;
    }
}
</style>