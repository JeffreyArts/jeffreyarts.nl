<template>
    <div class="block" :block-size="size">
        <AsciiBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'ascii'"                :data-blocktype="data.blockType"/>
        <CovidStarBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'covidStar'"        :data-blocktype="data.blockType"/>
        <TitleBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'title'"                :data-blocktype="data.blockType"/>
        <YearBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'year'"                  :data-blocktype="data.blockType"/>
        <NoteBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'note'"                  :data-blocktype="data.blockType"/>
        <IframeBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'iframe'"              :data-blocktype="data.blockType"/>
        <Model3DBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'model3D'"            :data-blocktype="data.blockType"/>
        <ImageBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'image'"                :data-blocktype="data.blockType"/>
        <LineBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'line'"                  :data-blocktype="data.blockType"/>
        <BannerBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'banner'"              :data-blocktype="data.blockType"/>
        <GlitchBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'glitch'"              :data-blocktype="data.blockType"/>
        <NewsletterBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'newsletter'"      :data-blocktype="data.blockType"/>
        <TagsBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'tags'"                   :data-blocktype="data.blockType"/>
        <TextBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'text'"                  :data-blocktype="data.blockType"/>
        <YoutubeBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'youtube'"            :data-blocktype="data.blockType"/>
        <CodeBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'code'"                  :data-blocktype="data.blockType"/>
        <FavoriteBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'favorite'"          :data-blocktype="data.blockType"/>
        <PageCommentsBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'pageComments'"  :data-blocktype="data.blockType"/>
        <PieceThumbnailBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'pieceThumbnail'"      :data-blocktype="data.blockType"/>
        <ProjectThumbnailBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'projectThumbnail'"  :data-blocktype="data.blockType"/>
        <ProjectArticleBlock @blockLoaded="blockLoaded" :options="data" v-if="data.blockType === 'projectArticle'"  :data-blocktype="data.blockType"/>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import AsciiBlock from "./ascii.vue"
import BannerBlock from "./banner.vue"
import CodeBlock from "./code.vue"
import CovidStarBlock from "./covid-star.vue"
import GlitchBlock from "./glitch.vue"
import IframeBlock from "./iframe.vue"
import ImageBlock from "./image.vue"
import LineBlock from "./line.vue"
import NoteBlock from "./note.vue"
import TagsBlock from "./tags.vue"
import TextBlock from "./text.vue"
import TitleBlock from "./title.vue"
import NewsletterBlock from "./newsletter.vue"
import Model3DBlock from "./model-3d.vue"
import FavoriteBlock from "./favorite.vue"
import PageCommentsBlock from "./page-comments.vue"
import PieceThumbnailBlock from "./piece-thumbnail.vue"
import ProjectThumbnailBlock from "./project-thumbnail.vue"
import ProjectArticleBlock from "./project-article.vue"
import YoutubeBlock from "./youtube.vue"
import YearBlock from "./year.vue"
import { BlockType } from "@/components/layout/layout-types"

export default defineComponent ({
    name: "blockComponent", 
    components: { 
        AsciiBlock,
        BannerBlock,
        CodeBlock,
        CovidStarBlock,
        GlitchBlock,
        IframeBlock,
        ImageBlock,
        LineBlock,
        NewsletterBlock,
        NoteBlock,
        Model3DBlock,
        FavoriteBlock,
        PageCommentsBlock,
        PieceThumbnailBlock,
        ProjectThumbnailBlock,
        ProjectArticleBlock,
        TagsBlock,
        TextBlock,
        TitleBlock,
        YearBlock,
        YoutubeBlock,
    },
    props: {
        data: {
            type: Object as PropType<BlockType["data"]>,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
    },
    data() {
        return {
        
        }
    },
    computed: {
    },
    mounted() {
        if (typeof window === "undefined") {
            return
        }
    },
    unmounted() {
    //
    },
    methods: {
        blockLoaded() {
            this.$emit("blockLoaded")
        }
    }
})

</script>

<style lang="scss">

.block {
    padding: 20px;

    // This will make GPU handle the transformations, instead of the CPU
    will-change: transform;
    transform: translateZ(0);

    transition: all .1s linear;
    
    &.__isFixed {
        position: absolute;
    } 
    &.__isLoaded {
        opacity: 0;
    } 

    // Display blockType for dev purposes
    // > *:after {
    //     content: attr(data-blocktype);
    //     position: absolute;
    //     top: 8px;
    //     background-color: var(--contrast-color);
    //     color: var(--bg-color);
    //     padding: 4px 8px;
    //     left: 12px;
    //     opacity: 0.7;
    // }
}

</style>