import axios from "axios";
import _ from "lodash";

import { BlockType } from "@/components/layout/layout-types";
import ProjectType  from "./../../types/project";
import { FilterOptions } from "@/components/filter.vue";

export interface PageType {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    path: string;
    collectionType: string;
    layout?: {
        size_xs: number;
        size_s: number;
        size_m: number;
        size_l: number;
        size_xl: number;
    };
    blocks: Array<BlockType>;
    metaDescription: string;
    metaTags: string[];
    pageTitle: string;
    archived?: boolean;
    project?: ProjectType;
    displayFilters?: boolean;
    filter?: FilterOptions;
    custom?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class PayloadPageModel {
    private readonly endpoint = import.meta.env.VITE_PAYLOAD_REST_ENDPOINT;
    private readonly collectionName = "pages";
    
    public data = undefined as PageType | undefined

    async getPageByPath(path: string): Promise<PageType> {
        let collection = this.collectionName;
        this.data = undefined

        if (path.startsWith("/project/")) {
            collection = "projects";
        }

        const validatePiece = /^\/project\/[a-z0-9-]+\/[a-z0-9-]+$/i;
        if (path.startsWith("/piece/") || validatePiece.test(path)) {
            collection = "pieces";
        }

        try {
            const response = await axios.get(`${this.endpoint}/${collection}?where[path][equals]=${path}`);
            const docs = response.data?.docs;

            if (!docs || docs.length !== 1) {
                throw new Error("Page not found");
            }

            const page = docs[0];
            if (page.blocks.length > 0) {
                page.blocks = page.blocks.map((block: any, index: number) => ({
                    size: block.size,
                    position: index + 1,
                    id: block.id,
                    data: _.omit(block, ["size", "id"]),
                })) as Array<BlockType>;
            }

            if (page.filter?.show?.filters) {
                page.filter.displayFilters = page.filter.show.filters;
                delete page.filter.show;
            }
            
            this.data = {
                ...page,
                collectionType: collection
            }

            return page;
        } catch (error) {
            throw error
        }
    }

    // async getProjectsPage(): Promise<Array<ProjectType>> {
    //     const collection = "project-positions";

    //     try {
    //         const response = await axios.get(`${this.endpoint}/${collection}?sort=position&depth=2`);
    //         const docs = response.data?.docs;

    //         if (!docs || docs.length < 1) {
    //             throw new Error("Cannot retrieve projects");
    //         }

    //         return docs.map((doc: any) => {
    //             const project = doc.project;

    //             // Format year range
    //             if (parseInt(project.year.from) === parseInt(project.year.to)) {
    //                 project.year = project.year.from.toString();
    //             } else if (isNaN(Number(project.year.to))) {
    //                 project.year = `${project.year.from} - present`;
    //             } else {
    //                 project.year = `${project.year.from} - ${project.year.to}`;
    //             }

    //             // Prefix path
    //             if (!project.path.startsWith("/project")) {
    //                 project.path = `/project${project.path}`;
    //             }

    //             return _.pick(project, ["id", "title", "year", "thumbnail", "path", "description"]);
    //         }) as Array<ProjectType>;
    //     } catch (error) {
    //         throw new Error(error);
    //     }
    // }

    convertBlockToBlockType(block: { [key: string]: unknown }): BlockType {
        if (!block.size || !block.id) {
            throw new Error(`Invalid block ${JSON.stringify(block, null, 2)}`);
        }

        return {
            size: block.size,
            id: block.id,
            data: _.omit(block, ["size", "id"]),
        } as BlockType;
    }
}

export default PayloadPageModel;
