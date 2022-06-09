/* eslint-disable import/no-unresolved */
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import WindiCSS from "vite-plugin-windicss";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
    root: "src/frontend",
    plugins: [
        vue(),
        WindiCSS(),
        Icons({
            autoInstall: true,
            compiler: "vue3",
        }),
    ],
    build: {
        outDir: "../../dist/frontend",
        emptyOutDir: true,
    },
    server: {
        port: 14811,
        strictPort: true,
    },
});
