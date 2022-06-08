import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
    { path: "/", name: "home", component: () => import("./pages/Home.vue") },
    { path: "/about", name: "about", component: () => import("./pages/About.vue") },
    { path: "/airing", name: "airing", component: () => import("./pages/Airing.vue") },
    { path: "/completed", name: "completed", component: () => import("./pages/Completed.vue") },
    { path: "/search", name: "search", component: () => import("./pages/Search.vue") },
    { path: "/settings", name: "settings", component: () => import("./pages/Settings.vue") },
    // fallback to home
    { path: "/:catchAll(.*)*", redirect: "/" },
];

export default createRouter({ routes, history: createWebHashHistory() });
