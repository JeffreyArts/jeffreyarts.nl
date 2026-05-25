// import type { DefineComponent } from "vue"
import defaultTemplate from "@/routes/templates/default.vue"
import Error404 from "@/routes/error-404.vue"
import Error301 from "@/routes/error-301.vue"
import Favorites from "@/routes/favorites.vue"
import LivePreview from "@/routes/live-preview.vue"
import WurmpjeTemplate from "@/routes/templates/wurmpje.vue"
import pageRoutes from "./pages.json"
import projectRoutes from "./projects.json"
import pieceRoutes from "./pieces.json"

import { createWebHistory, createRouter } from "vue-router"

const routes = [
    {
        path: "/:pathMatch(.*)*",
        // name: "404 | Not found",
        component: defaultTemplate,
    },
    {
        path: "/favorites",
        name: "Favorites",
        component: Favorites,
    },
    {
        path: "/wurmpje",
        name: "Wurmpje's playground",
        component: WurmpjeTemplate,
    },
    {
        path: "/404",
        name: "404 | Not found",
        component: Error404,
    },
    {
        path: "/live-preview",
        name: "Live preview",
        component: LivePreview,
    }
]

const addRoutes = (route:  {
    path: string,
    name:  string
    meta: {
        description?: string,
        keywords?: string
        redirect?: string
    },
    template: string
}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let component = undefined as any
    if (route.template === "default") {
        component = defaultTemplate
    }

    if (route.meta.redirect) {
        component = Error301
    }

    if (!component) {
        console.error(`Invalid template (${route.template}) for route ${route.path}`)
        return
    }

    const meta = route.meta as {
        description: string
        keywords: string
    }

    routes.push({
        path: route.path,
        name: route.name,
        meta: meta,
        component,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
}

if (pageRoutes) { pageRoutes.forEach(addRoutes) }
if (projectRoutes) { projectRoutes.forEach(addRoutes) }
if (pieceRoutes) { pieceRoutes.forEach(addRoutes) }


////////////////////////////////////////////////////////////////////////
// IMPORTANT NOTICE
// The code above will be updated via the `yarn add-route` command
// Be cautious when you make custom modifications (it should just work, 
// but just pay extra attention during your commits)
//
// - Jeffrey Arts, August 2024
////////////////////////////////////////////////////////////////////////


const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
