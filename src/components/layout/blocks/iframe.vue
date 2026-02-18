<template>
    <div class="iframe-block">
        <header class="iframe-block-header">
            <!-- Used to draw UI buttons -->
            <ul>
                <li></li>
                <li></li>
                <li></li>
            </ul>
            <!-- /Used to draw UI buttons -->
            
            <span class="iframe-block-header-title">
                <a :href="options.url" target="_blank" class="iframe-block-header-link">
                    {{ title }}
                    <jaoIcon name="external-link" size="medium" />
                </a>
            </span>

            <span class="iframe-block-header-refresh-button" @click="refreshIframe" v-if="options.showRefresh">Refresh</span>
            
        </header>

        <section class="iframe-block-content-wrapper" :style="{aspectRatio: options.autoScaling ? `${frame.width} / ${frame.height}` : ''}">
            <div class="iframe-block-content" :style="{
                scale: options.autoScaling ? scale : 1,
                height: `${frame.height}px`,
                width: `${frame.width}px`}"
                :type="frame.size"
                ref="iframeBlock">
                <iframe :src="options.url" frameborder="0" allow="fullscreen" allowfullscreen ref="iframe" />
            </div>
        </section>

        <span @click="setFullscreen" class="iframe-block-fullscreen-button">
            <jaoIcon name="fullscreen" size="medium" />
        </span>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import jaoIcon from "./../../jao-icon.vue"

export type IframeBlock = {
    blockType: "iframe"
    size: number
    id: string
    title: string
    url: string
    showRefresh: boolean
    autoScaling: string
    portraitRatio: string
    landscapeRatio: string
}

export default defineComponent ({
    name: "iframeBlock",
    components: {
        jaoIcon, 
    }, 
    props: {
        options: {
            type: Object as PropType<IframeBlock>,
            required: true
        },
    },
    watch: {
        "options": {
            handler() {

                this.$nextTick(() => {
                    this.setTitle()
                    this.refreshIframe()
                    this.onLayoutChange()
                })
            },
            deep: true,
            immediate: true
        }
    },
    data() {
        return {
            scale: 1,
            title: "",
            frame: {
                width: 0,
                height: 0,
                size: "dynamic" as "dynamic" | "phone" | "tablet" | "desktop"
            },
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }

        window.addEventListener("layoutChange", this.onLayoutChange)
        window.addEventListener("layoutLoaded", this.onLayoutChange)
    },
    unmounted() {
        window.removeEventListener("layoutChange", this.onLayoutChange)
        window.removeEventListener("layoutLoaded", this.onLayoutChange)
    },
    methods: {
        refreshIframe(){
            const iframe = this.$refs["iframe"] as HTMLIFrameElement
            if (!iframe){
                return
            }
            iframe.src = iframe.src
        },
        setTitle(){
            this.title = this.options.title

            if (!this.title) {
                this.title = new URL(this.options.url).hostname
            }
        },
        setFullscreen() {
            const iframe = this.$refs["iframe"] as HTMLIFrameElement
            iframe.requestFullscreen()
        },
        onLayoutChange(){
            try {
                if (!this.options.autoScaling) {
                    if (window.innerHeight/window.innerWidth < 1) { // Landscape
                        const width = parseInt(this.options.landscapeRatio.split("/")[0])
                        const height = parseInt(this.options.landscapeRatio.split("/")[1])
                        const ratio =  height / width
                        this.frame.width = this.$el.clientWidth
                        this.frame.height = this.$el.clientWidth * ratio
                    } else if (window.innerHeight/window.innerWidth >= 1) { // Portrait
                        const width = parseInt(this.options.portraitRatio.split("/")[0])
                        const height = parseInt(this.options.portraitRatio.split("/")[1])
                        const ratio =  height / width
                        this.frame.width = this.$el.clientWidth
                        this.frame.height = this.$el.clientWidth * ratio
                    } else {
                        // shouldn't occur, but better safe than sorry
                        this.frame.width = this.$el.clientWidth
                        this.frame.height = this.$el.clientWidth
                    }
                } else {
                    if (this.$el.clientWidth < 512) {
                        this.frame.width = 375
                        this.frame.height = 812
                        this.frame.size = "phone"
                    } else if (this.$el.clientWidth < 768) {
                        this.frame.size = "tablet"
                        this.frame.width = 1024
                        this.frame.height = 768
                    } else {
                        this.frame.size = "desktop"
                        this.frame.width = 1440
                        this.frame.height = 810
                    }
                    this.scale = this.$el.clientWidth / this.frame.width
                }

                // this.refreshIframe()

                this.$emit("blockLoaded")
            } catch (error) {
                this.$emit("blockLoaded")
                console.warn("Error in onLayoutChange:", error)
            }
        }
    },
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables.scss";

.iframe-block {
    position: relative;
}

.iframe-block-header {
    position: relative;
    background-color: #dfdfdf;
    background-image: linear-gradient(0deg, rgba(0,0,0,.08), transparent);
    width: 100%;
    color: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px 8px 0 0;
    gap:12px;
    font-family: var(--accent-font);


    ul { 
        position: absolute;
        top: 50%;
        display: flex;
        gap: 4px;
        flex-flow: row;
        top: 14px;
        left: 14px;
        margin: 0;
        padding: 0;

        li {
            display: block;
            padding: 0;
            margin: 0;
            border-radius: 100%;
            width: 8px;
            height: 8px;
            background-color: rgba(0,0,0,.08);
        }
    }
}

.iframe-block-header-title {
    padding: 8px;
    display: inline-block;
    text-decoration: none;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: calc(100% - 128px);
}

.iframe-block-header-link {
    color: currentColor;
    text-decoration: none;

    svg {
        transition: var(--transition-default);
        height: 13px;
        translate: 0 2px;
        opacity: 0;
    }

    &:hover,
    &:focus {
        svg {
            opacity: 1;
        }
    }
}

.iframe-block-content-wrapper {
    width: 100%;
    overflow: hidden;
}

.iframe-block-content {
    background-image: linear-gradient(180deg, rgba(0,0,0,.16), transparent 8px);
    display: block;
    width: 100%;
    background-color: #111;
    color:  #eee;
    padding: 0;
    border-radius: 0 0 4px 4px;
    overflow: auto;
    padding: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    transform-origin: top left;

    iframe {
        margin: 0;
        width: 100%;
        height: 100%;
    }
}

.iframe-block-fullscreen-button {
    display: inline-block;
    transition: var(--transition-default);
    padding: 8px 4px 4px 8px;
    position: absolute;
    bottom: 0;
    right: 0;

    &:hover,
    &:focus {
        background: rgba(255,255,255,.8);
        svg {
            height: 52px;
        }
    }
    svg {
        transition: var(--transition-default);
        height: 26px;
        color: #111;
    }
}

.iframe-block-header-refresh-button {
    position: absolute;
    right: 16px;
    font-size: 12px;
    border: 1px solid var(--contrast-color);
    background-color: rgba(255,255,255,.4);
    padding: 4px 8px;
    text-shadow: 0 1px rgba(255,255,255,.8);
    transition: var(--transition-default);
    opacity: 0.9;
    border-radius: 3px;
    cursor: pointer;
    
    &:hover,
    &:focus {
        opacity: 0.9;
        background-color: #fff;
        background-color: rgba(255,255,255,.8);
        border-radius: 1px;
        scale: 1.1;
    }
}
</style>