import {z} from "zod";
import {notFound} from "@tanstack/react-router";


export function tryNotFound<T>(data: unknown, schema: z.ZodType<T>): T {
    try {
        return schema.parse(data);
    }
    catch {
        throw notFound();
    }
}
