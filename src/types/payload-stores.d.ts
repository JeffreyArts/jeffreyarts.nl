
export type MediaSize = {
    url: string
    width: number
    height: number
    focalX: number
    focalY: number
    filesize: number
    filename: string
    mimeType: number
}

export type MediaImage = {
    id: string
    url: string
    filename: string
    mimeType: string
    filesize: number
    createdAt: string
    updatedAt: string
    thumbnailURL: string
    sizes: {
        banner_sm: MediaSize
        banner_md: MediaSize
        banner_lg: MediaSize
        image_sm: MediaSize
        image_md: MediaSize
        image_lg: MediaSize
        thumbnail: MediaSize
    }
}


export type Piece = {
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
    youtubeProperties: { url: string, ratio: string },
    imageProperties: {image: MediaImage},
    codeProperties: { title: string, link: string, language: "typescript" | "javascript" | "arduino" | "bash" | "css" | "html" | "php", code: string},
    iframeProperties: { url: string,  image?: MediaImage }

}

export type Project = {
    id: string
    path: string
    archived: boolean
    categories: Array<{
        id: string
        title: string
    }>
    series: Array<{
        id: string
        title: string
    }>
    year: {
        from: string | number
        to: string | number
    }
    title: string
    description: SlateNode
    thumbnail: {
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

export type Product = {
    createdAt: string,
    updatedAt: string,
    title: string,
    year: string | Array<string>,
    subtitle?: string, 
    price: number, 
    details: Array<{ name: string, value: string, id: string}>,
    images?: Array< { image: string | MediaImage, id: string }>,
    pageTitle: string,
    metaDescription?: string,
    metaTags?: Array<string>,
    path: string,
    piece?: string | Piece,
    project?: string | Project,
} 