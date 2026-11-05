/// <reference types="vite/client"/>
import React, {lazy} from "react";
import appCss from "~/styles.css?url";
import {QueryClient} from "@tanstack/react-query";
import {Toaster} from "~/lib/client/components/ui/toast";
import {authOptions} from "~/lib/client/react-query/query-options";
import {createRootRouteWithContext, HeadContent, Outlet, Scripts} from "@tanstack/react-router";


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    beforeLoad: async ({ context: { queryClient } }) => {
        return queryClient.query({ ...authOptions, staleTime: "static" });
    },
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "Tresso" },
        ],
        links: [
            { rel: "stylesheet", href: appCss },
        ],
    }),
    component: RootComponent,
    shellComponent: RootComponent,
})


function RootComponent() {
    return (
        <RootDocument>
            <Outlet/>
        </RootDocument>
    )
}


function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
        <head>
            <HeadContent/>
        </head>
        <body className="bg-background text-foreground">
        <div className="flex h-screen min-h-0 flex-col">
            <div className="grow min-h-0 h-full flex flex-col">
                <Toaster/>
                {children}
            </div>
        </div>

        {import.meta.env.DEV && <ReactQueryDevtools/>}

        <Scripts/>

        </body>
        </html>
    )
}


const ReactQueryDevtools = lazy(() =>
    import("@tanstack/react-query-devtools").then((res) => ({ default: res.ReactQueryDevtools }))
);
