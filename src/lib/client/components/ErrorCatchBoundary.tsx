import {Skull} from "lucide-react";
import type {ErrorComponentProps} from "@tanstack/react-router";
import {ErrorComponent} from "~/lib/client/components/ErrorComponent";


export function ErrorCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
    if (!(error instanceof Error) || !error.message) {
        return (
            <ErrorComponent
                title="Well, This is Awkward"
                icon={<Skull className="size-9"/>}
                text="Sorry, it looks like something isn’t working right now. Please try refreshing the page or come back later."
            />
        )
    }

    return (
        <ErrorComponent
            text={error.message}
            title="An Error Occurred"
        />
    );
}
