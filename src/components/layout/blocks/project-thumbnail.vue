<template>
    <div class="project-thumbnail-block">
        <router-link class="project-thumbnail-block-wrapper" :to="options.link">
            <figure class="project-thumbnail-block-image-wrapper">
                <img :src="src" class="project-thumbnail-block-image" ref="image"/>
            </figure>
            
            <h4 class="project-thumbnail-block-title">
                <span>{{ options.title }}</span>
                <jaoIcon name="chevron-right-fat" inactive-color="transparent" size="small"></jaoIcon>
            </h4>
        </router-link>

        <div class="project-thumbnail-tags" v-if="options.categories">
            <span class="project-thumbnail-tag" v-for="category, index in options.categories" :key="index" @click="goToCategory(category.id)">
                {{ category.title }}
            </span>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import jaoIcon from "@/components/jao-icon.vue"

export type ProjectThumbnailBlock = {
    blockType: "projectThumbnail"
    link: string
    categories: Array<{
        id: string
        title: string
    }>
    title: string
    image: {
        width: number
        height: number
        filename: string
        mimeType: string
        title: string
        description: string
        url: string
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
}

export default defineComponent ({
    name: "projectThumbnailBlock",
    components: {
        jaoIcon
    }, 
    props: {
        options: {
            type: Object as PropType<ProjectThumbnailBlock>,
            required: true,
        },
    },
    watch: {
        "options": {
            handler() {
                
                const img = this.$refs["image"] as HTMLImageElement;
                if (img) {
                    // Reset de afbeelding eerst
                    img.src = '';
                }
                
                this.$nextTick(() => {
                    this.loadImage();
                });
                
            },
            deep: true
        }
    },
    data: function() {
        return {
            hoverEvent: undefined as undefined | gsap.core.Tween,
            imageSize: "image_sm" as "image_sm" | "image_md" | "image_lg" | "original",
            link: "",
            patternHover: false,
            bgImageCache: "" as string,
            bgSizeCache: "" as string
        }
    },
    computed: {
        ratio() {
            if (this.options.image?.sizes.image_sm) {
                return this.options.image.sizes.image_sm.width / this.options.image.sizes.image_sm.width
                // add placeholder image
            }
            return  "undefined"
        },
        src() {
            let src = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","")
            if (!this.options.image) {
                return
            }

            if (this.options.image?.mimeType.includes("svg")) {
                return src + this.options.image.url
            }

            if (this.imageSize === "original") {
                src += `/api/media/file/${this.options.image.filename}`
            } else {
                src += this.options.image.sizes[this.imageSize].url
            }
            return src
        }
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
        
        const img = this.$refs["image"] as HTMLImageElement

        if (!img) {
            this.$emit("blockLoaded")
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
            setTimeout(() => {
                this.$emit("blockLoaded")
            }, 0)
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
            const width = this.$el.clientWidth
            if (!this.options.image) {
                return this.imageSize = "original"
            }
            
            if (width > this.options.image.width) {
                return this.imageSize = "original"
            }
            
            if (width <= 320) {
                return this.imageSize = "image_sm"
            }

            if (width <= 800) {
                return this.imageSize = "image_md"
            }

            if (width <= 1200) {
                return this.imageSize = "image_lg"
            }

            return this.imageSize = "original"
        },
        loadImage() {
            const img = this.$refs["image"] as HTMLImageElement;
            
            if (!img) {
                this.$emit("blockLoaded");
                return;
            }

            img.addEventListener("load", () => {
                setTimeout(() => {
                    this.$emit("blockLoaded");
                }, 0)
            });
            
            if (img.complete) {
                setTimeout(() => {
                    this.$emit("blockLoaded");
                }, 0)
                return;
            }

            img.addEventListener("error", () => {
                this.$emit("blockLoaded");
            });
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
.project-thumbnail-block {

    container-name: project-thumbnail;
    container-type: inline-size;
    margin: 0;
    
    img {
        width: 100%;
        outline: 1px solid transparent;
        object-fit: cover;
        transition: var(--transition-default);
    }
}
.project-thumbnail-block-wrapper {
    color: var(--contrast-color);
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
    transition: var(--transition-default);
    opacity: 0.9;
    filter: saturate(.9);
    width: 100%;
    
    &:hover,
    &:focus {
        filter: saturate(1.04);
        opacity: 1;
        .project-thumbnail-block-title {
            translate: 16px 0;
            svg {
                translate: -16px 0;
            }
        }
        img {
            border-radius: 8px;
            outline: 1px solid var(--bg-color);
            box-shadow: 0 0 8px rgba(0,0,0,.32);
        }
    }
}

.project-thumbnail-block-image-wrapper {
    margin: 0;
    display: flex;
}

.project-thumbnail-block-title {
    display: flex;
    margin: 0;
    padding: 8px;
    justify-content: space-between;
    width: 100%;
    font-family: var(--accent-font);
    font-size: 16px 0;
    font-weight: normal;
    line-height: 1em;
    align-items: center;
    transition: var(--transition-default);
    word-wrap: anywhere;

    svg {
        height: 10px;
        transition: var(--transition-default);
    }
}

.project-thumbnail-tags {
    display: flex;
    gap: 8px;
    flex-flow: row wrap;
}
.project-thumbnail-tag {
    font-size: 12px;
    padding: 4px 8px;
    display: inline-block;
    font-family: var(--accent-font);
    background-color: #f0f0f0;
    color: #000;
}

@container project-thumbnail (min-width: 256px) {
    .project-thumbnail-block-title {
        padding: 8px 0;
        font-size: 24px;
        width: calc(100% - 24px);
        span {
            padding-right: 24px;
        }
    }
    
}
</style>