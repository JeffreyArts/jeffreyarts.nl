import axios from "axios"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import { fileURLToPath } from "url"

// Load environment variables from the .env file
dotenv.config()

const bold = (str) => {
    return `\x1b[1m${str}\x1b[0m`
}

// Fetch the API URL from the environment variable
const apiUrl = process.env.VITE_PAYLOAD_REST_ENDPOINT
const clientUrl = process.env.VITE_CLIENT_URL
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const generateRoutes = async (url, filename) => {
    const result = []
    
    try {
        const response = await axios.get(url)
        
        if (!response.data?.docs) {
            throw new Error("No documents found for", url)
        }
        
        response.data.docs.forEach(data => {
            const meta = {}
            
            if (typeof data.metaDescription == "string") {
                meta.description = data.metaDescription
            }

            if (data.metaTags?.length > 0) {
                meta.keywords = data.metaTags.join(", ")
            }

            if (typeof data.redirect === "string" && data.redirect.length > 0) {
                if (data.redirect[0] == "/") {
                    data.redirect = clientUrl + data.redirect
                }
                meta.redirect = `${data.redirect}`
            }

            // Ignore favorites route
            if(data.path == "/favorites") {
                return
            }

            result.push({
                path: data.path,
                name: data.title,
                meta,
                template: "default"
            })
        })

        const filePath = path.join(__dirname, `routes/${filename}.json`)
        fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf8")
        
        
        console.log(`${bold(result.length)} routes found for '${bold(filename)}' and added to '${filePath}'`)
    } catch (error) {
        console.error("Error fetching data:", error)
    }
}

// Call the function with the API URL
if (apiUrl) {
    
    const pageRoutes = await generateRoutes(`${apiUrl}/pages?limit=9999`, "pages")
    const pieceRoutes = await generateRoutes(`${apiUrl}/pieces?limit=9999`, "pieces")
    const projectRoutes = await generateRoutes(`${apiUrl}/projects?limit=9999`, "projects")

    const sitemap = []

    // read ./routes/*.json and add all paths to sitemap
    const routesDir = path.join(__dirname, "routes")
    const files = ['./pages.json', './pieces.json', './projects.json']

    files.forEach(file => {
        const filePath = path.join(routesDir, file)
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
        data.forEach(route => {
            sitemap.push(route.path)
        })
    })
    
    // Write sitemap to public folder on server start
        const sitemapPath = path.resolve(process.cwd(), "public", "sitemap.xml")
        let content = `<?xml version="1.0" encoding="UTF-8"?>\r\n\t<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

        content += sitemap.map(route => `
        <url>
            <loc>${clientUrl}${route}</loc>
        </url>`).join("")

        content += `</urlset>`
        fs.writeFileSync(sitemapPath, content)
    
} else {
    console.error("API URL is not defined in the .env file.")
}
