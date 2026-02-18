<template>
    <div class="page-comment-block">
        <header class="page-comment-block-header">
            <jao-icon class="page-comment-block-header-icon" name="comment" size="medium" />
            <h1 class="page-comment-block-title" v-if="comments.length == 0">Share your {{variant.singular}}</h1>
            <h1 class="page-comment-block-title" v-if="comments.length > 0">Some {{variant.plural}}</h1>
        </header>

        
        <section class="page-comment-block-comments">
            <article class="pcb-comment" v-for="comment in comments" :key="comment.id" :class="{'__isSelf': isSelf(comment)}">
                <header class="pcb-comment-header">
                    <h5 class="pcb-comment-header-title">{{ comment.user.username }}</h5>
                    <span class="pcb-comment-header-date">{{ cleanTime(comment.createdAt) }}</span>
                </header>
                <div class="pcb-comment-content">
                    <p>{{ comment.text }}</p>
                </div>
            </article>
        </section>
        <footer class="page-comment-block-footer" ref="footer">
            <p v-if="!userVerified">You need to register with your e-mailaddress to post a message. Click on the account icon in the menu to register an account or login</p>
            <form class="page-comment-block-form" @submit.prevent="handleNewComment" v-if="userVerified">
                <h3 v-if="comments.length != 0">Share your {{ variant.singular }}</h3>
                <textarea name="" v-model="newComment" rows="3" placeholder="Type message"></textarea> 
                <span class="align-right">
                    <button type="submit" class="button small">Share</button>
                </span>
            </form>
        </footer>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import jaoIcon from "@/components/jao-icon.vue"
import SlateText, { SlateNode } from "@/components/slate-text.vue"
import PayloadStore from "@/stores/payload"
import gsap from "gsap"

type PageComment = {
    createdAt: string
    updatedAt: string
    id: string
    text: string
    page_id: string
    page_type: string
    user: {
        id: string
        username: string
        email: string
        verified: boolean
        createdAt: string
        updatedAt: string
    }
}

export type PageCommentsBlock = {
    blockType: "pageComments"
    page_id: string
    page_type: string
    comments?: PageComment[]
}

export default defineComponent ({
    name: "PageCommentsBlock",
    components: {
        jaoIcon,
        SlateText
    }, 
    setup() {
        const payload = PayloadStore()
        return { payload }    
    },
    data() {
        return {
            variants: [
                {singular: "comment", plural: "comments"},
                {singular: "thought", plural: "thoughts"},
                {singular: "perspective", plural: "perspectives"},
                {singular: "opinion", plural: "opinions"},
                {singular: "message", plural: "messages"},
                {singular: "love", plural: "love"},
            ],
            newComment: ""
        }
    },
    computed: {
        variant() {
            return this.variants[Math.floor(Math.random() * this.variants.length)]
        },
        userVerified() {
            return this.payload?.auth?.self?.verified
        },
        comments() {
            if (this.options.comments && this.options.comments.length > 0) {
                return this.options.comments
            }
            return []
        }
    },
    watch: {
        "options": {
            handler() {
                this.$nextTick(() => {
                    this.$emit("blockLoaded")
                })
            },
            deep: true,
            immediate: true
        }
    },
    props: {
        options: {
            type: Object as PropType<PageCommentsBlock>,
            required: true
        },
    },
    methods: {
        cleanTime(time: string) {
            const res = new Date(time).toLocaleDateString('nl-NL', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit'
            }).replace(/\//g, '-')
            return res
        },
        isSelf(comment: PageComment) {
            if (!comment.user) {
                return false
            }
            if (!this.payload.auth?.self) {
                return false
            }
            return comment.user.id == String(this.payload.auth?.self?.id)
        },
        async handleNewComment() {
            const self = this.payload.auth?.self
            if (!self) {
                return
            }
            
            const pageData = this.payload.page?.data
            if (!pageData) {
                return
            }

            const response = await this.payload.POST("/page-comments", {
                text: this.newComment,
                user: self,
                page_type: pageData.collectionType,
                page_id: pageData.id
            })
            
            const footer = this.$refs.footer as HTMLElement

            gsap.to(footer, {
                opacity: 0,
                duration: 0.5,
                height: 0,
                ease: "power2.inOut",
                onComplete: () => {
                    if (!this.options.comments) {
                        this.options.comments = []
                    }
                    // Add the new comment to the comments array (at the top)
                    this.options.comments.unshift(response.data.doc)

                    console.log(this.options.comments, response.data)
                    this.newComment = ""
                }
            })
        }
    }
})

</script>

<style lang="scss">
@use "./../../../assets/scss/variables";
.page-comment-block {
    container-name: pageComment;
}

.page-comment-block-header {
    display: flex;
    flex-direction: row;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
}

.page-comment-block-header-icon {
    width: 38px;
    height: 38px;
}

.page-comment-block-title {
    font-size: 16px;
    font-family: var(--accent-font);
    font-weight: normal;
    margin: 0;
    padding: 0;
}

.page-comment-block-form {
    display: flex;
    flex-flow: column;
    gap: 8px;

    h3 {
        margin: 0;
        font-family: var(--accent-font);
        font-size: 20px;
        font-weight: normal;
    }

    textarea {
        border: 1px solid var(--contrast-color);
        padding: 8px 8px;
        font-size: 14px;

        &:focus {
            border-color: var(--accent-color);
            outline: none;
        }
    }

    p {
        font-size: 12px;
        font-family: var(--accent-font);
        margin: 32px 0;
    }

    .align-right {
        align-self: end;
    }
}

.page-comment-block-footer {
    overflow: hidden;
}

.page-comment-block-comments {
    max-height: 256px;
    overflow: auto;
    padding-right: 16px;
}

// COMMENTS

.pcb-comment {
    margin-bottom: 16px;

    &.__isSelf {
        .pcb-comment-header-title {
            &:before {
                background-color: var(--accent-color);
                opacity: 1;
            }
        }
    }
}

.pcb-comment-header {
    margin-top: 16px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
}

.pcb-comment-header-title {
    font-size: 14px;
    margin: 0;
    padding: 0;
    font-family: var(--accent-font);
    font-weight: normal;
    position: relative;
    margin-left: 10px;
    font-size: 16px;

    &:before {
        content: "";
        margin-right: 8px;
        position: absolute;
        height: 100%;
        width: 2px;
        background-color: var(--contrast-color);
        left: -8px;
        opacity: 0.2;
    }
}   

.pcb-comment-header-date {
    font-size: 12px;
    margin: 0;
    padding: 0;
    opacity: 0.8;
}

.pcb-comment-content p {
    margin: 8px 0;
}

// .page-comment-block-comments {
//     display: flex;
//     flex-direction: column;
//     gap: 4px;
// }


@container pageComment (width > 420px) {
    /* Change the flex direction of the .child element. */
    .page-comment-block-title {
        font-size: 24px;
    }
}
@container pageComment (width > 280px) {
    /* Change the flex direction of the .child element. */
    .page-comment-block-title {
        font-size: 18px;
    }
}
@container pageComment (width > 360px) {
    /* Change the flex direction of the .child element. */
    .page-comment-block-title {
        font-size: 20px;
    }
}
</style>