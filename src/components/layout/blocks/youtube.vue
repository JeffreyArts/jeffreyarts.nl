<template>
    <div class="youtube-block">
        <iframe 
        :style="`aspect-ratio: ${aspectRatio};`"
        :src="url"
        frameborder="0" 
        allow="fullscreen" 
        allowfullscreen />

        <div class="youtube-message-overlay __isBlurred" :style="`aspect-ratio: ${aspectRatio}; background-image: url(${thumbnail});`" v-if="!allowYoutube"></div>
        <div class="youtube-message-overlay" :style="`aspect-ratio: ${aspectRatio};`" v-if="!allowYoutube">
            <div class="message">
                <h3>{{ options.title }}</h3>
                <p>This video is hosted on YouTube. Click the button below to allow YouTube videos to be displayed on this site.</p>
                <button @click="setAllowYoutube(true)" class="button">Allow YouTube Videos</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"

export type YoutubeBlock = {
    blockType: "youtube"
    size: number
    id: string
    title: string
    url: string
    ratio: string
}

export default defineComponent ({
    name: "youtubeBlock",
    props: {
        options: {
            type: Object as PropType<YoutubeBlock>,
            required: true
        },
    },
    watch: {
        "options": {
            handler() {
                this.$emit("blockLoaded")
            },
            deep: true,
            immediate: true
        }
    },
    computed: {
        url(): string {
            if (this.allowYoutube) {
                return this.options.url
            } else {
                return ""
            }
            // return this.options.url.replace("watch?v=", "embed/")
        },
        thumbnail(): string {
            const urlSections = this.options.url.split("/")
            const videoId = urlSections[urlSections.length - 1]
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }
    },
    data() {
        return {
            allowYoutube: false,
            aspectRatio: "4/3",
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }

        // load allowYoutube cookie
        cookieStore.get("allowYoutube").then(cookie => {
            if (cookie?.value === "true") {
                this.allowYoutube = true
            }
        })

        this.setRatio()

        setTimeout(()=> {
            this.$emit("blockLoaded")
        })
    },
    methods: {
        setAllowYoutube(value: boolean) {
            this.allowYoutube = value
            cookieStore.set("allowYoutube", value.toString())
        },
        setRatio() {
            if (this.options.ratio) {
                this.aspectRatio = this.options.ratio
            }
        }
    }
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables.scss";


.youtube-block {
    position: relative;
    overflow: hidden;
    display: flex;
    
    iframe {
        width: 100%;
    }
}
.youtube-message-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-color: rgba(255,255,255,.5);
    
    &.__isBlurred {
        filter: blur(4px);
        opacity: 0.6;
        background-color: transparent;
    }

    .message {
        max-width: calc(100% - 32px);
        width: 80%;
        text-align: center;
    }
}
</style>