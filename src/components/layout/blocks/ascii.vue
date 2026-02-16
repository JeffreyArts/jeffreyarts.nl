<template>
    <div class="ascii-block" ref="container">
        <pre class="ascii-block-content" ref="content">{{ ascii }}</pre>
        <div class="slider" ref="slider" :class="{'__isActive': slider.isActive}"
            v-if="options.allowResizing"
            @pointerdown="startSlider">
            <div class="knob"></div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import PayloadStore from "@/stores/payload"
import gsap from "gsap"

export type MediaSize = {
    url: string
    width: number
    height: number
    filesize: number
    filename: string
}

export type AsciiBlock = {
    blockType: "ascii"
    allowResizing: boolean
    pixelSize: {
        min: number
        max: number
        default: number
    }
    charlist: {
        type: string
        value: string
        custom?: string
    }
    image: {
        id: string
        url: string
        filename: string
        mimeType: string
        filesize: number
        createdAt: string
        updatedAt: string
        thumbnailURL: string
        sizes: {
            banner_sm: MediaSize
            banner_md: MediaSize
            banner_lg: MediaSize
            image_sm: MediaSize
            image_md: MediaSize
            image_lg: MediaSize
            thumbnail: MediaSize
        }
    }
}

export default defineComponent ({
    name: "asciiBlock",
    watch: {
        "options": {
            async handler() {
                
                if (this.options.pixelSize) {
                    if (this.options.pixelSize) {
                        this.slider.value = this.options.pixelSize.default
                        this.slider.min = this.options.pixelSize.min
                        this.slider.max = this.options.pixelSize.max
                    }
                    this.$nextTick(() => {
                        this.updateKnobPosition()
                    })
                }

                this.imageLoading = this.loadAciiImage()
                await this.imageLoading

                this.defaultLines = this.ascii.split("\n").length
                this.defaultCharactersPerLine = this.ascii.split("\n")[0].length
                
                this.$nextTick(() => {
                    this.$emit("blockLoaded")
                })
            },
            deep: true,
            immediate: true
        }
    },
    setup() {
        const payload = PayloadStore()
        return {
            payload
        }
    },
    data() {
        return {
            ascii: "",
            defaultFontSize: undefined as number | undefined,
            fontSize: 16,
            defaultLines: 0,
            lines: 0,
            lineHeight: 1,
            imageLoadTimeout: undefined as undefined | NodeJS.timeout,
            defaultCharactersPerLine: 0,
            charactersPerLine: 0,
            height: 0,
            currentRequestId: 0,
            imageLoading: undefined as undefined | Promise<void>,
            slider: {
                min: 4,
                max: 64,
                value: 8,
                isActive: false
            }
        }
    },
    props: {
        options: {
            type: Object as PropType<AsciiBlock>,
            required: true
        },
    },
    mounted() {
        this.$el.parentElement.style.zIndex = 1

        window.addEventListener("resize", this.scaleText)
        window.addEventListener("layoutChange", this.setDefaultFontSize) 
        window.addEventListener("layoutLoaded", this.setDefaultFontSize) 
    },
    unmounted() {
        window.removeEventListener("resize", this.scaleText)
        window.removeEventListener("layoutChange", this.setDefaultFontSize)
        window.removeEventListener("layoutLoaded", this.setDefaultFontSize) 
    },
    methods: {
        fadeOutLetters() {
            const content = this.$refs.content as HTMLElement
            if (!content) return
            
            // Simple fade out of entire content
            gsap.to(content, {
                opacity: 0,
                duration: 0.64,
                ease: "power2.out"
            })
        },
        setDefaultFontSize(event: Event) {
            const customEvent = event as CustomEvent
            const blockID = this.$el.parentElement.id.replace("block-", "")
            let block = this.$el.parentElement

            if (customEvent?.detail?.blocks) {
                block = customEvent.detail.blocks.find((block: any) => block.id === blockID)
            }
            if (block) {
                this.scaleText()
                this.defaultFontSize = this.fontSize
                this.scaleText()
            }
        },
        fadeInLetters() {
            const content = this.$refs.content as HTMLElement
            if (!content) return
            
            // Force opacity to 0 first, then animate to 1
            // cancel the previous animation
            gsap.killTweensOf(content)
            
            // Use nextTick to ensure DOM is updated
            this.$nextTick(() => {
                gsap.to(content, {
                    opacity: 1,
                    duration: 1.64,
                    ease: "power2.out"
                })
            })
        },
        async loadAciiImage() {
            // Fade out current letters
            this.fadeOutLetters()
            
            // Wait a bit for fade out to complete
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Increment request ID to cancel previous requests
            this.currentRequestId++
            const requestId = this.currentRequestId
            
            let uri = `/media/ascii/${this.options.image.id}?inverted=true`
            
            if (this.options.image.filename.endsWith(".stl")) {
                uri += "&size=image_md"
            }
            uri += `&pixelSize=${this.slider.value}`

            if (this.options.charlist?.value) {
                uri += `&charlist=${this.options.charlist.value}`
            }

            try {
                const result = await this.payload.GET(uri)
                
                // Check if this is still the current request
                if (requestId !== this.currentRequestId) {
                    return // This request is outdated, ignore the result
                }
                
                if (result.data) {
                    this.ascii = result.data
                    this.$nextTick(() => {
                        this.fontSize = 20
                        this.lines = this.ascii.split("\n").length
                        this.scaleText()
                        
                        // Fade in new letters
                        this.fadeInLetters()
                    })
                }
            } catch (error) {
                // Only log error if this is still the current request
                if (requestId === this.currentRequestId) {
                    console.error('Error loading ASCII image:', error)
                }
            }
        },
        scaleText(): void {
            const container = this.$refs.container as HTMLElement
            const content = this.$refs.content as HTMLElement
            if (!content) {
                return
            }
            
            const rects = content.getBoundingClientRect()
            this.height = rects.height
            content.style.fontSize = `${this.fontSize}px`
            
            if (content.clientWidth > container.clientWidth) {
                this.fontSize-=.2
                if (this.fontSize > 1) {
                    return this.scaleText()
                }
            }
            
            if (this.defaultFontSize) {
                this.lineHeight = this.defaultFontSize * (this.defaultLines / this.lines)
                content.style.lineHeight = `${this.lineHeight * 1}px`
            }



        },
        startSlider(event: MouseEvent | TouchEvent) {
            event.preventDefault()
            
            // Get click position and set slider value immediately
            const slider = this.$refs.slider as HTMLElement
            if (!slider) return
            
            let clientX = 0
            if (event instanceof MouseEvent) {
                clientX = event.clientX
            } else if (event instanceof TouchEvent) {
                clientX = event.touches[0].clientX
            }
            
            const rects = slider.getBoundingClientRect()
            const xValue = clientX - rects.x
            
            
            // Set slider value based on click position
            this.setSliderValue(xValue)
            
            // Start drag functionality
            this.slider.isActive = true
            window.addEventListener("pointerup", this.endSlider)
            window.addEventListener("pointermove", this.moveSlider)
        },
        calculateSliderValue(xValue: number) {
            const slider = this.$refs.slider as HTMLElement
            const rects = slider.getBoundingClientRect()
            return Math.round((xValue / rects.width) * (this.slider.max - this.slider.min) + this.slider.min)
        },
        async setSliderValue(xValue: number) {
            // Do not re-load the image if the slider value has not changed
            if (this.calculateSliderValue(xValue) == this.slider.value ) {
                return
            }

            this.slider.value = this.calculateSliderValue(xValue)
            this.updateKnobPosition()

            if (this.imageLoadTimeout) {
                clearTimeout(this.imageLoadTimeout)
            }

            this.imageLoadTimeout = setTimeout(() => {
                this.imageLoading = this.loadAciiImage()
            }, 100)

        },
        updateKnobPosition() {
            const slider = this.$refs.slider as HTMLElement
            const knob = slider.querySelector(".knob") as HTMLElement
            const rects = slider.getBoundingClientRect()
            const paddingLeft = 16
            const paddingRight = 16
            
            const width = rects.width - paddingLeft - paddingRight

            // Calculate knob position based on slider value
            const percentage = (this.slider.value - this.slider.min) / (this.slider.max - this.slider.min)
            const xValue = percentage * width
            knob.style.left = `${(xValue - knob.clientWidth / 2) + paddingLeft}px`
        },
        moveSlider(event: MouseEvent | TouchEvent) {
            const slider = this.$refs.slider as HTMLElement
            
            if (!slider) {
                return
            }
            let xValue = 0
            if (event instanceof MouseEvent) {
                xValue = event.clientX
            } else if (event instanceof TouchEvent) {
                xValue = event.touches[0].clientX
            }
            const rects = slider.getBoundingClientRect()
            xValue -= rects.x
            if (xValue < 0) {
                xValue = 0
            }
            if (xValue > rects.width) {
                xValue = rects.width
            }
            
            if (xValue >= 0 && xValue <= rects.width) {
                this.setSliderValue(xValue)
            }
            

        },
        endSlider(event: MouseEvent | TouchEvent) {
            if (this.imageLoading) {
                this.imageLoading.then(() => {
                    this.slider.isActive = false
                    this.imageLoading = undefined
                })
            } else {
                this.slider.isActive = false
            }
            window.removeEventListener("pointermove", this.moveSlider)
            window.removeEventListener("pointerup", this.endSlider)
        }
    }
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables";
.ascii-block {
    // background-color: #ffffe8;
    line-height: 1.4;
    font-size: 14px;
    width: 100%;
    &:hover {
        .slider {
            opacity: 1;
        }
    }
}

.ascii-block-content {
    display: inline-block;
    margin: 0;
    position: relative;
    font-family: var(--accent-font);
    overflow: hidden;

    // font-family: "Courier New", Courier, monospace;
}

.slider {
    position: absolute;
    bottom: -32px;
    width: calc(100% - 64px);
    min-width: 128px;
    max-width: 320px;
    height: 64px;
    padding: 0 16px;
    // background-color: #ccc;
    left: 50%;
    translate: -50% 0;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;

    &:after{ 
        content: "";
        position: absolute;
        top: 32px;
        left: 16px;
        width: calc(100% - 32px);
        height: 1px;
        background-color: #ccc;
    }

    .knob {
        position: absolute;
        top: 24px;
        left: 0;
        width: 16px;
        height: 16px;
        z-index: 1;
        background-color: var(--contrast-color);
    }
    
    &.__isActive {
        opacity: 1;
        
        .knob {
            background-color: var(--accent-color);
        }
    }
}



</style>