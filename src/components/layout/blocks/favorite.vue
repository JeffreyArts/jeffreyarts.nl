<template>
    <section class="favorite-block" @click="toggleLike">
        <jaoIcon :name="icon" size="medium" class="favorite-block-heart" :transitEffect="{duration: .64, effect:'shuffle'}"/>
        <div class="favorite-block-amount" v-html="favsNumber"></div>
    </section>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import Payload from "@/stores/payload"
import { Icon } from "jao-icons"
import jaoIcon from "@/components/jao-icon.vue"
import ProjectType  from "../../../types/project"
import { FavoritesService } from "@/services/favorites"

export type FavoriteBlock = {
    blockType: "favorite"
    project: ProjectType
}

export default defineComponent ({
    name: "favoriteBlock",
    components: {
        jaoIcon,
    }, 
    props: {
        options: {
            type: Object as PropType<FavoriteBlock>,
            required: true,
        },
    },   
    setup() {
        const payload = Payload()

        return {
            payload
        }
    },
    watch: {
        "options": {
            handler() {
                this.$emit("blockLoaded")
            },
            immediate: true,
            deep: true
        }
    },
    data: () => {
        return {
            favs: 0,
            selfLove: false,
            blocked: false
        }
    },
    computed: {
        icon() {
            return this.selfLove ? "heart" : "heart-outline"
        },
        favsNumber() {
            const svgElement = Icon(this.favs,"medium")
            const serializer = new XMLSerializer();
            if (svgElement ) {
                return serializer.serializeToString(svgElement);
            }
            return ""
        }
    },
    created() {
        this.setSelfLove()
        this.loadFavs()
    },
    methods: {
        async setSelfLove() {
            if (!this.payload.page?.data) return
            
            const pageId = this.payload.page.data.id
            const pageType = this.payload.page.data.collectionType
            
            this.selfLove = await FavoritesService.setSelfLove(pageId, pageType)
        },

        async loadFavs() {
            if (!this.payload.page?.data) return
            
            const pageId = this.payload.page.data.id
            const pageType = this.payload.page.data.collectionType
            
            this.favs = await FavoritesService.loadFavs(pageId, pageType)
        },

        async toggleLike() {
            if (this.blocked || !this.payload.page?.data) return
            
            const pageId = this.payload.page.data.id
            const pageType = this.payload.page.data.collectionType
            
            this.selfLove = !this.selfLove
            this.blocked = true
            try {
                const isLiked = await FavoritesService.toggleLike(pageId, pageType)
                this.selfLove = isLiked
                this.favs = isLiked ? this.favs + 1 : this.favs - 1
            } catch (error) {
                console.error('Error toggling like:', error)
            } finally {
                this.blocked = false
            }
        }
    }
})
</script>

<style lang="scss">
@use "./../../../assets/scss/variables.scss";

.favorite-block {
    display: flex;
    flex-flow: row nowrap;
    color: #333
}

.favorite-block-heart {
    width: 100%;
}

.favorite-block-amount {
    display: flex;
    align-items: flex-end;

    svg {
        margin-left: 24px;
        height: 72px;
    }
}
</style>