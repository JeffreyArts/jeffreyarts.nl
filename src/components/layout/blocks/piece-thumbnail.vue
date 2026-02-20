<template>
    <div class="piece-thumbnail-block">
        <router-link class="piece-thumbnail-block-wrapper" :to="options.piece.path">
            <figure v-if="options.piece.type === 'image'" class="piece-thumbnail-block-image-wrapper">
                <img :src="src" class="piece-thumbnail-block-image" ref="image"/>
            </figure>

            <section v-if="options.piece.type === 'youtube'" class="piece-thumbnail-block-youtube-wrapper">
                <div :style="`aspect-ratio: ${ratio}; pointer-events:none; background-image: url(${src});`"></div>
                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 800 800">
                    <path style="fill: #f61c0d;" d="M633.85,116.95H166.15C74.39,116.95,0,191.34,0,283.1v233.8c0,91.76,74.39,166.15,166.15,166.15h467.7c91.76,0,166.15-74.39,166.15-166.15v-233.8c0-91.76-74.39-166.15-166.15-166.15Z"/>
                    <path style="fill: #fff;" d="M521.48,411.38l-218.76,104.33c-5.83,2.78-12.56-1.47-12.56-7.93v-215.19c0-6.55,6.91-10.79,12.75-7.83l218.76,110.86c6.5,3.3,6.39,12.62-.19,15.76Z"/>
                </svg>
            </section>
                
            <section v-if="options.piece.type === 'code'" class="piece-thumbnail-block-code-wrapper">
                <highlightjs :language="options.piece.codeProperties.language" :code="options.piece.codeProperties.code" ref="code"/>
            </section>

            
            <section v-if="options.piece.type === 'iframe'" class="piece-thumbnail-block-iframe-wrapper">
                <template v-if="options.piece.iframeProperties.image">
                    <ul>
                        <li></li>
                        <li></li>
                        <li></li>
                    </ul>
                    <span class="piece-thumbnail-block-iframe-wrapper-url">{{ cleanUrl }}</span>
                    <img :src="src" class="piece-thumbnail-block-image" ref="image"/>
                </template>
                <iframe 
                :style="`aspect-ratio: ${ratio};`"
                :src="src"
                v-if="!options.piece.iframeProperties.image"
                frameborder="0" 
                ref="iframe"/>
            </section>
        </router-link>

        <footer class="piece-thumbnail-footer">
            <div class="piece-thumbnail-footer-left">
                <h4 class="piece-thumbnail-block-title">
                    <span>{{ options.piece.title }}</span>
                </h4>
                <div class="piece-thumbnail-tags" v-if="options.piece.categories">
                    <span class="piece-thumbnail-tag" v-for="category, index in options.piece.categories" :key="index" @click="goToCategory(category.id)">
                        {{ category.title }}
                    </span>
                </div>
            </div>
            <div class="piece-thumbnail-footer-right">
                <figure ref="yearSVG" class="piece-thumbnail-footer-year"></figure>
                <!-- <jaoIcon name="comment" size="medium"></jaoIcon> -->
                <jaoIcon :name="heartIcon" size="medium" inactiveColor="transparent" activeColor="var(--contrast-color)" @click="toggleLike" :transitEffect="{duration: .64, effect:'shuffle'}"></jaoIcon>
            </div>
        </footer>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import jaoIcon from "@/components/jao-icon.vue"
import { Icon } from "jao-icons"
import highlightjs from "./../../highlightjs.vue"
import { FavoritesService } from "@/services/favorites"

export type IframeProperties = {
    url:string
    image?: ImageProperties
}

export type YoutubeProperties = {
    url: string
    ratio: string
}

export type CodeProperties = {
    title: string
    link: string
    language: "typescript" | "javascript" | "arduino" | "bash" | "css" | "html" | "php"
    code: string
}

export type ImageProperties = {
    focalX: number
    focalY: number
    height: number
    width: number
    mimeType: number
    url: string
    filename: string
    sizes: {
        image_sm: {
            width: number
            height: number
            url: string
        }
        image_md: {
            width: number
            height: number
            url: string
        }
        image_lg: {
            width: number
            height: number
            url: string
        }
    }
}

export type PieceThumbnailBlock = {
    blockType: "pieceThumbnail"
    piece: {
        id: string
        type: string
        path: string
        title: string
        year: string
        favs: number
        categories?: Array<{
            id: string
            title: string
        }>
        series?: Array<{
            id: string
            title: string
        }>
        youtubeProperties: YoutubeProperties,
        imageProperties: {image: ImageProperties},
        codeProperties: CodeProperties,
        iframeProperties: IframeProperties
    }
}

export default defineComponent ({
    name: "pieceThumbnailBlock",
    components: {
        jaoIcon,
        highlightjs
    }, 
    props: {
        options: {
            type: Object as PropType<PieceThumbnailBlock>,
            required: true,
        },
    },
    data: function() {
        return {
            imageSize: "image_sm" as "image_sm" | "image_md" | "image_lg" | "original",
            link: "",
            patternHover: false,
            bgImageCache: "" as string,
            bgSizeCache: "" as string,
            yearSVG: undefined as undefined | SVGAElement,
            frame: {
                width: 0 as number,
                height: 0 as number,
                size: ""
            },
            selfLove: false,
            blockLikeToggle: false
        }
    },
    computed: {
        ratio() {
           
            if (this.options.piece.type === "youtube") {
                const ratio = this.options.piece.youtubeProperties.ratio.split("/")
                return Number(ratio[0])/Number(ratio[1])
            } else if (this.options.piece.type === "iframe") {
                return 4/3
            } 
            return  "undefined"
        },
        cleanUrl() {
            let url = this.options.piece.iframeProperties.url.replace("https://", "").replace("http://", "").replace("www.", "").replace(/\/$/, "")
            return url
        },
        src() {
            let src = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","")

            if (this.options.piece.type === "image") {
                let imageProperties = this.options.piece.imageProperties.image //? this.options.piece.imageProperties.image : this.options.piece.imageProperties

                if (imageProperties.mimeType.toString().includes("svg")) {
                    return src + imageProperties.url
                }

                if (this.imageSize === "original") {
                    src += `/api/media/file/${imageProperties.filename}`
                } else {
                    src += imageProperties.sizes[this.imageSize].url
                }
            } else if (this.options.piece.type === "youtube") {
                const urlSections = this.options.piece.youtubeProperties.url.split("/")
                const videoId = urlSections[urlSections.length - 1]
                src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            } else if (this.options.piece.type === "iframe") {

                let imageProperties = this.options.piece.iframeProperties.image //? this.options.piece.imageProperties.image : this.options.piece.imageProperties

                if (!imageProperties) {
                    return this.options.piece.iframeProperties.url
                }

                if (imageProperties.mimeType.toString().includes("svg")) {
                    return this.options.piece.iframeProperties.url
                }

                if (this.imageSize === "original") {
                    src += `/api/media/file/${imageProperties.filename}`
                } else {
                    src += imageProperties.sizes[this.imageSize].url
                }
            }


            return src
        },
        heartIcon() {
            return this.selfLove ? "heart" : "heart-outline"
        },
        year() {
            if ( Number(this.options.piece.year) < 0) {
                return Math.abs(Number(this.options.piece.year)).toLocaleString('nl-NL') + "BC"
            }
            return this.options.piece.year
        }
    },
    watch: {
        "options": {
            handler() {
                this.$nextTick(() => {
                    this.$emit("blockLoaded")
                })
            },
            deep: true
        }
    },
    created() {
        this.setSelfLove()
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }


        if (this.$refs.yearSVG && this.year) {
            const svgContainer = this.$refs.yearSVG as HTMLElement
            const SVGElement = Icon(this.year, "medium")
            if (!svgContainer || !SVGElement) {
                return
            }
            svgContainer.appendChild(SVGElement)
        }
        
        const img = this.$refs["image"] as HTMLImageElement

        if (!img) {
            this.$nextTick(() => {

                this.$emit("blockLoaded")
            })
            return
        }
        
        new Promise<void>((resolve) => {
            if (img.complete) {
                resolve()
            } else {
                img.addEventListener("load", () => {
                    setTimeout(() => {
                        resolve()
                    })
                })
            }
        }).then(() => {
            this.$emit("blockLoaded")
        }).catch((err) => {
            console.error(err)
            this.$emit("blockLoaded")
        })

        window.addEventListener("layoutChange", this.updateLayoutChange)
    },
    unmounted() {
        window.removeEventListener("layoutChange", this.updateLayoutChange)
    },
    methods: {
        updateLayoutChange() {
            // const width = this.$el.clientWidth
            // if (width > this.options.piece.properties.width) {
            //     return this.imageSize = "original"
            // }
            
            // if (width <= 320) {
            //     return this.imageSize = "image_sm"
            // }

            // if (width <= 800) {
            //     return this.imageSize = "image_md"
            // }

            // if (width <= 1200) {
            //     return this.imageSize = "image_lg"
            // }

            return this.imageSize = "original"
        },
        goToCategory(categoryId: string) {
            this.$router.push({
                path: "/archive",
                query: {
                    categories: categoryId
                }
            })
        },
        async setSelfLove() {
            if (!this.options.piece.id) {
                return
            }

            this.selfLove = await FavoritesService.setSelfLove(this.options.piece.id, 'pieces')
        },

        async toggleLike() {
            if (this.blockLikeToggle || !this.options.piece.id) return
            this.blockLikeToggle = true
            this.selfLove = !this.selfLove
            
            try {
                await FavoritesService.toggleLike(this.options.piece.id, 'pieces')
            } catch (error) {
                console.error('Error toggling like:', error)
            } finally {
                this.blockLikeToggle = false
            }
        }
    }
})


</script>

<style lang="scss">
@use "./../../../assets/scss/variables.scss";
.piece-thumbnail-block {

    container-name: piece-thumbnail;
    container-type: inline-size;
    margin: 0;
}
.piece-thumbnail-block-wrapper {
    color: var(--contrast-color);
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
    transition: var(--transition-default);
    opacity: 0.9;
    filter: saturate(.9);
    width: 100%;
    overflow: hidden;
    outline: 1px solid transparent;

    &:hover,
    &:focus {
        background:var(--bg-color);
        filter: saturate(1.04);
        opacity: 1;
        border-radius: 8px;
        outline: 1px solid var(--bg-color);
        box-shadow: 0 0 12px rgba(0,0,0,.16);

    }
}

.piece-thumbnail-block-image {
    width: 100%;
}

.piece-thumbnail-block-image-wrapper {
    margin: 0;
    display: flex;
    
    img {
        width: 100%;
        outline: 1px solid transparent;
        object-fit: cover;
        transition: var(--transition-default);
    }
}

.piece-thumbnail-block-youtube-wrapper {
    div {
        width: 100%;
        background-size: cover;
    }
    svg {
        height: 80px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
}

.piece-thumbnail-block-iframe-wrapper {
    display: flex;
    flex-flow: column;
    position: relative;

    iframe {
        width: 100%;
        pointer-events: none;
    }
    ul {
        display: flex;
        gap: 4px;
        flex-flow: row;
        padding: 14px;
        margin: 0;
        background-color: #ccc;
        height: 36px;
        border-radius: 4px 4px 0 0;

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
.piece-thumbnail-block-iframe-wrapper-url {
    position: absolute;
    top: 12px;
    left: 50%;
    font-size: 12px;
    font-family: var(--accent-font);
    color: var(--contrast-color);
    opacity: 0.6;
    transform: translateX(-50%);
    width: 50%;
    text-align: center;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}

.piece-thumbnail-block-code-wrapper {
    width: 100%;
    background: var(--contrast-color);
    color: var(--bg-color);
    overflow: auto;
    max-height: 240px;
    padding-left: 16px;
}

.piece-thumbnail-block-title {
    display: flex;
    margin: 0;
    padding: 8px 0 0;
    justify-content: space-between;
    width: 100%;
    font-family: var(--accent-font);
    font-size: 12px;
    font-weight: normal;
    line-height: 1em;
    align-items: center;
    transition: var(--transition-default);

    svg {
        height: 10px;
    }
}

.piece-thumbnail-tags {
    display: flex;
    gap: 8px;
    flex-flow: row wrap;
}

.piece-thumbnail-tag {
    font-size: 10px;
    opacity: 0.6;
    font-family: var(--accent-font);
    color: var(--contrast-color);

    &:hover, 
    &:focus {
        text-decoration: underline;
        cursor: pointer;
    }
}

@container piece-thumbnail (min-width: 256px) {
    .piece-thumbnail-block-title {
        padding: 8px 0 4px;
        font-size: 16px;
    }
}

.piece-thumbnail-footer {
    display: flex;
    flex-flow: row;
    justify-content: space-between;
}

.piece-thumbnail-footer-left {
    max-width: 80%;
}

.piece-thumbnail-footer-right {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    opacity: 0.8;

    figure {
        margin: 0;
    }

    svg {
        height: 18px;
        display: block;
    }
}

.piece-thumbnail-footer-year svg {
    height: 18px;

    rect[v="0"] {
        fill: transparent;
    }
}

@media (min-width: 480px) {
    .piece-thumbnail-footer-right {
        svg {
            height: 22px;
        }
    }
    .piece-thumbnail-footer-year svg {
        height: 24px;
    }

}
</style>