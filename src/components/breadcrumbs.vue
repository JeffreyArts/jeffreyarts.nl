<template>
    <nav class="site-breadcrumbs">
        <jaoIcon :name="icon" size="large" :transit-effect="{duration: 1, delay:.002, effect: 'shuffle'}" class="site-breadcrumbs-icon"/>
        <span class="site-breadcrumbs-route" v-for="(p,k) in path" :key="k">
            <router-link :to="p.link"><span v-html="p.name.join('')" /></router-link>
            <jaoIcon name="chevron-right" size="small"  class="site-breadcrumbs-chevron" v-if="k != path.length-1"/>
        </span>
    </nav>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import { sentenceCase } from "change-case"
import payloadStore from "@/stores/payload"
import jaoIcon from "./jao-icon.vue"
import { iconsMap } from "jao-icons"
import gsap from "gsap"

type BreadcrumbItem = {
    id: string,
    link: string,
    name: string[],
}
export default defineComponent({
    name: "breadcrumbsComponent",
    components: {
        jaoIcon
    },
    data() {
        return {
            path: [] as BreadcrumbItem[],
            icon: "empty",
            animation: undefined as undefined | gsap.core.Tween
        }
    },
    watch: {
        "Payload.page.data": {
            handler() {
                if (!this.Payload.page?.data) {
                    return
                }
                this.changePath()
                this.changeIcon()
            }, 
            immediate: true
        }
    },
    setup() {
        const Payload = payloadStore()
       
        return {
            Payload,
        }
    },
    beforeCreate() {
    },
    mounted() {
    },
    methods: {
        changeIcon() {
            if (this.$route.path.startsWith("/")) { this.icon = "home"}
            if (this.$route.path.startsWith("/archive")) { this.icon = "archive"}
            if (this.$route.path.startsWith("/project")) { this.icon = "hammer"}
            if (this.$route.path.startsWith("/tool")) { this.icon = "wrench"}
            if (this.$route.path.startsWith("/about")) { this.icon = "user-outline"}
            const pageData = this.Payload.page?.data

            if (pageData) {
                if (typeof pageData.archived === "boolean") {
                    if (pageData.archived) {
                        this.icon = "archive"
                    } else {
                        this.icon = "hammer"
                    }
                }

                if (typeof pageData.project?.archived === "boolean") {
                        if (pageData.project.archived) {
                        this.icon = "archive"
                    } else {
                        this.icon = "hammer"
                    }
                }
            }
        },
        changePath() {
            if (this.animation) {
                gsap.killTweensOf(this.animation)
            }

            const elements = document.querySelectorAll(".site-breadcrumbs-route .char, .site-breadcrumbs-chevron")
            if (elements.length <= 0) {
                this.updatePath()
                return
            }

            this.animation = gsap.to(".site-breadcrumbs-route .char, .site-breadcrumbs-chevron", {
                opacity: 0,
                scale: 0,
                duration: .24,
                stagger: {
                    each: .032,
                    from: "end"
                },
                onComplete: () => {
                    this.updatePath()
                    this.$nextTick(() => {
                        gsap.fromTo(".site-breadcrumbs-route .char, .site-breadcrumbs-chevron", {
                            opacity: 0,
                            scale: 0,
                        },{
                            scale: 1,
                            opacity: 1,
                            stagger: {
                                each: .1,
                                from: "start"
                            },
                        })
                    })
                }
            })
        },
        updatePath() {
            const arr = this.$route.path.slice(1).split("/")
            let link = ""
            let archived = false
            this.path = arr.map((path: string, key:number) => {
                let name = sentenceCase(path).toLowerCase()
                name = name.charAt(0).toUpperCase() + name.slice(1)
                const pageData = this.Payload.page?.data

                if (pageData && key == 0) {
                    if (typeof pageData.archived === "boolean") {
                        if (pageData.archived) {
                            archived = true
                            name = "Archive"
                        }
                    }
                    if (typeof pageData.project?.archived === "boolean") {
                        if (pageData.project.archived) {
                            archived = true
                            name = "Archive"
                        }
                    }
                }
                
                if (name === "Piece" && key === 0) {
                    name = "Archive"
                    link = link.replace("/piece","/archive")
                }

                link += `/${path}`
                
                const res = {
                    id: `${key}`,
                    link: link,
                    name: name.split("").map((c: string) => {
                        if (c === " ") { c = "&nbsp;" }
                        return `<span class="char">${c}</span>`
                    }),
                }

                if (link === '/project') {
                    res.link = "/projects"
                }

                if (archived && key === 0) {
                    res.link = "/archive"
                }

                return res
            })
        }
    }
})
</script>

<style lang="scss">
@use "./../assets/scss/variables";
.site-breadcrumbs {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: var(--accent-font);
    
    a {
        color: var(--contrast-color);
        opacity: 0.64;
        text-decoration: none;
        transition: var(--transition-fast);

        &:last-child {
            opacity: 0.8;
        }

        &:focus,
        &:hover {
            opacity: 1;
        }
    }

    .char {
        display: inline-block;
    }
}

.site-breadcrumbs-icon {
    height: 26px;
}

.site-breadcrumbs-chevron {
    height: 10px;
    margin-left: 8px;
}
</style>
