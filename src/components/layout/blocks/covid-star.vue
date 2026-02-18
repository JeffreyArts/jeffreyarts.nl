<template>
    <div>
        <figure class="covid-star-block" :title="options.string">
            <img :src="src" :alt="options.string" :srcset="srcSet" v-if="options.image" ref="image" class="covid-star-image"/>
            
            <input class="covid-star-block-title" v-if="options.string" :value="options.string" @input="updateString"/>
                
            </input>
        </figure>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import axios from "axios"
import modalComponent from "@/components/modal.vue"

type imageSize = {
    filename: string
    filesize: number
    height: number
    mimeType: string
    url: string
    width: number
}

export type CovidStarBlock = {
    blockType: "covidStar"
    string?: string
    image?: {
        createdAt: string
        filename: string
        filesize: number
        focalX: number
        focalY: number
        height: number
        id: string
        mimeType: "image/png"
        name: string
        sizes: {
            xs: imageSize
            s: imageSize
            m: imageSize
            l: imageSize
            xl: imageSize
        }
        thumbnailURL: string
        updatedAt: string
        url: string
        width: number
    }
}

export default defineComponent ({
    name: "covidStarBlock",
    components: {
        modalComponent
    }, 
    props: {
        options: {
            type: Object as PropType<CovidStarBlock>,
            required: true,
        },
    },
    data: function() {
        return {
            imageSize: "xs" as "xs" | "s" | "m" | "l" | "xl" | "original",
            updateStringTimeout: undefined as undefined | NodeJS.Timeout
        }
    },
    computed: {
        srcSet() {
            let result = ""
            if (!this.options.image?.sizes) {
                return result
            }

            let baseUrl = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","")
            // http://localhost:3000/api/covid-star/file/test123-320x320.png
            // http://localhost:3000/api/covid-star/file/test-320x320.png
            for (const size in this.options.image.sizes) {
                const imageSize = this.options.image.sizes[size as keyof typeof this.options.image.sizes]
                result += `${baseUrl}${imageSize.url} ${imageSize.width}w, `
            }

            return result.slice(0, -2)
        },
        src() {
            let src = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT.replace("/api","")
            if (!this.options.image) {
                return ""
            }

            if (this.options.image.mimeType.includes("svg")) {
                return src + this.options.image.url
            }

            if (this.imageSize === "original") {
                src += `/api/media/file/${this.options.image.filename}`
            } else {
                src += this.options.image.sizes[this.imageSize].url
            }
            return src
        },
    },
    mounted() {
        if (typeof window === "undefined") {
            return;
        }
        
        this.loadImage();
    },
    methods: {
        loadHandler() {
            this.$emit("blockLoaded");
        },
        updateString(e: Event) {
            const target = e.target as HTMLInputElement
            this.options.string = target.value

            if (this.updateStringTimeout) {
                clearTimeout(this.updateStringTimeout)
            }

            this.updateStringTimeout = setTimeout(() => {
                this.loadImage()
            }, 500)
        },

        async loadImage() {
            
            if (!this.options.string) {
                // set string to current date dd-mm-yyyy
                const now = new Date()
                const day = String(now.getDate()).padStart(2, '0')
                const month = String(now.getMonth() + 1).padStart(2, '0')
                const year = now.getFullYear()
                this.options.string = `${day}-${month}-${year}`
            }
            
            let inputString = this.options.string
            let uri = `${import.meta.env.VITE_PAYLOAD_REST_ENDPOINT}/covid-star/name/${inputString}?inverted=true`
            
            await axios.get(uri).then((res) => {
                if (res.data && res.data.docs) {
                    this.options.image = res.data.docs[0]
                }
            }).catch((err) => {
                console.error("Error loading covid star image", err)
            })

            const img = this.$refs["image"] as HTMLImageElement;
            
            if (!img) {
                this.$emit("blockLoaded");
                return;
            }
            
            
            img.addEventListener("load", this.loadHandler);
            img.addEventListener("error", this.loadHandler);
            
            if (img.complete && img.src) {
                setTimeout(() => {
                    this.$emit("blockLoaded");
                }, 0)
                return;
            }
        },
    }
})


</script>

<style lang="scss">
@use "./../../../assets/scss/variables.scss";
.covid-star-block {
    margin: 0;
    position: relative;
}
    
.covid-star-image {
    width: 100%;
    object-fit: cover;
    display: block;
    aspect-ratio: 1;
}

.covid-star-block-title {
    display: inline-block;
    border: 0 none transparent;
    width: 100%;
    padding: 16px 8px;
    font-size: 24px;
    font-family: 'Fixedsys';
    text-align: center;
    background-color: transparent;
    &:focus {
        outline: none;
    }
}


</style>