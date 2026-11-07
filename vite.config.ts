import path from "path";
import {defineConfig} from "vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import {tanstackStart} from "@tanstack/react-start/plugin/vite";
import react, {reactCompilerPreset} from "@vitejs/plugin-react";
import {reactClickToComponent} from "vite-plugin-react-click-to-component";


export default defineConfig({
    resolve: {
        tsconfigPaths: true,
        alias: {
            "~": path.resolve(import.meta.dirname, "./src"),
        },
    },
    plugins: [
        tanstackStart({
            prerender: {
                failOnError: false,
                retryCount: 3,
                retryDelay: 500,
            },
            spa: {
                enabled: true,
            },
            router: {
                semicolons: true,
                quoteStyle: "double",
                codeSplittingOptions: {
                    defaultBehavior: [
                        [
                            "component",
                            "pendingComponent",
                            "errorComponent",
                            "notFoundComponent",
                            "loader",
                        ],
                    ],
                },
            },
        }),
        react(),
        reactClickToComponent(),
        babel({ presets: [reactCompilerPreset()] }),
        tailwindcss(),
    ],
})
