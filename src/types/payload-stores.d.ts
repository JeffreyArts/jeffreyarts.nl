
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

export type Product = {
    createdAt: string,
    updatedAt: string,
    title: string,
    subtitle?: string, 
    price: number, 
    details: Array<{ name: string, value: string, id: string}>,
    images?: Array< { image: string | MediaImage, id: string }>,
    pageTitle: string,
    metaDescription?: string,
    metaTags?: Array<string>,
    path: string,
    piece?: string | {id: string},
    project?: string | {id: string},
} 