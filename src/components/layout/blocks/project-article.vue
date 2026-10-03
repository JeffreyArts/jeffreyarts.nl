<template>
    <div class="project-article-block">
        <router-link class="project-article-block-wrapper" :to="options.project.path">
            <h2 class="project-article-title" :class="[options.project.title.length > 16 ? '__isSmall' : '']" ref="title">
                {{ options.project.title }}
            </h2>
            <figure class="project-article-block-image-wrapper">
                <img :src="src" class="project-article-block-image" ref="image"/>
            </figure>

            <span class="project-article-button">view project</span>
        </router-link>
        <SlateText  class="project-article-text" v-if="!options.hideDescription " :data="description" />
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import SlateText, { SlateNode } from "@/components/slate-text.vue"
import * as jaoIcons from "jao-icons"
import jaoIcon from "@/components/jao-icon.vue"
import DynamicImage from "@/components/dynamic-image.vue"
import { Project } from "@/types/payload-stores"

export type ProjectArticleBlock = {
    blockType: "projectArticle"
    hideDescription: boolean
    customDescription: SlateNode
    project: Project
}

export default defineComponent ({
    name: "projectArticleBlock",
    components: {
        jaoIcon,
        SlateText,
        DynamicImage
    }, 
    props: {
        options: {
            type: Object as PropType<ProjectArticleBlock>,
            required: true,
        },
    },
    watch: {
        "options.project.thumbnail": {
            handler() {
                this.$emit("blockLoaded")
            },
            deep: true,
        }
    },
    data: function() {
        return {
            hoverEvent: undefined as undefined | gsap.core.Tween,
            imageSize: "image_sm" as "image_sm" | "image_md" | "image_lg" | "original",
            link: "",
            patternHover: false,
            bgImageCache: "" as string,
            bgSizeCache: "" as string,
            imageLoaded: false
        }
    },
    computed: {
        ratio() {
            if (this.options.project?.thumbnail?.sizes?.image_sm) {
                return this.options.project?.thumbnail.sizes.image_sm.width / this.options.project?.thumbnail.sizes.image_sm.width
                // add placeholder image
            }
            return  "undefined"
        },
        src() {
            let src = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","")
            
            if (this.options.project?.thumbnail.mimeType.includes("svg")) {
                return src + this.options.project?.thumbnail.url
            }

            if (this.imageSize === "original") {
                src += `/api/media/file/${this.options.project?.thumbnail.filename}`
            } else {
                src += this.options.project?.thumbnail.sizes[this.imageSize].url
            }
            return src
        },
        description() {
            if (this.options.customDescription) {
                return this.options.customDescription
            }
            return this.options.project.description
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
        
        const img = this.$refs["image"] as HTMLImageElement

        if (!img) {
            this.$emit("blockLoaded")
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
        this.updateYear()
        window.addEventListener("layoutChange", this.updateLayoutChange)
    },
    unmounted() {
        window.removeEventListener("layoutChange", this.updateLayoutChange)
    },
    methods: {
        updateLayoutChange() {
            const width = this.$el.clientWidth

            this.imageSize = "original"
            if (width > this.options.project?.thumbnail.width) {
                this.imageSize = "original"
            } else  if (width <= 320) {
                this.imageSize = "image_sm"
            } else if (width <= 800) {
                this.imageSize = "image_md"
            } else if (width <= 1200) {
                this.imageSize = "image_lg"
            }
            this.imageLoaded = true
            return this.imageSize
        },
        updateYear() {
            let year = this.options.project.year.from + " - " + this.options.project.year.to
            if (this.options.project.year.to == this.options.project.year.from) {
                year = this.options.project.year.to.toString()
            } else if (this.options.project.year.to == "-") {
                year = this.options.project.year.from + " - present" 
                
            }
            const svg = jaoIcons.Icon(year, "small")
            const title = this.$refs.title as HTMLElement
            
            if (title && svg) {
                svg.classList.add("project-article-block-year")
                title.appendChild(svg)
            }
        },
        goToCategory(categoryId: string) {
            this.$router.push({
                path: "/archive",
                query: {
                    categories: categoryId
                }
            })
        }
    }
})


</script>

<style lang="scss">
@use "./../../../assets/scss/variables.scss";
.project-article-block {

    container-name: project-article;
    container-type: inline-size;
    margin: 0;
    
    img {
        width: 100%;
        outline: 1px solid transparent;
        object-fit: cover;
        transition: var(--transition-default);
    }
}

.project-article-text {
    width: 80%;
    margin-top: 32px;
    font-family: var(--accent-font);
    font-size: 16px;
}

.project-article-block-wrapper {
    position: relative;
    display: block;
    margin-top: 22px;
    cursor: pointer;

    &:hover,
    &:focus {
        .project-article-button {
            scale: 1.2;
        }
    }
}

.project-article-title {
    position: absolute;
    top: -22px;
    line-height: 1.2;
    display: inline-block;
    padding: 6px 16px;
    margin: 0;
    background-color: var(--contrast-color);
    color: var(--bg-color);
    z-index: 1;
    font-family: var(--accent-font);
    left: 8px;
    font-size: 14px;
    max-width: calc(100%);
}

.project-article-button {
    position: absolute;
    bottom: -12px;
    right: 8px;
    font-family: var(--accent-font);
    background-color: var(--contrast-color);
    color: var(--bg-color);
    padding: 4px 12px;
    transition: var(--transition-default);
    font-size: 12px;
}

.project-article-block-year {
    display: none;
    position: absolute;
    right: -4px;
    top: 4px;
    height: 13px;
    translate: 100% 0;

    .jao-icon-cell[v="0"] {
        fill: transparent;
    }
}

.project-article-block-image-wrapper {
    margin: 0;
    display: flex;
}
.project-article-block-image {
    
}

@container project-article (min-width: 256px) {
    .project-article-text {
        margin-left: 24px;
    }

    .project-article-block-year {
        display: block;
    }

    
    .project-article-title {
        max-width: calc(100% - 60px);
        left: 16px;
        font-size: 16px;
        
        &.__isSmall {
            font-size: 14px;
        }
    }

    .project-article-button {
        right: 16px;
    }
}
</style>