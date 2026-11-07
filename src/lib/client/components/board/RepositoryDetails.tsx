import type {CardType} from "~/lib/types/types";
import {Badge} from "~/lib/client/components/ui/badge";

export function RepositoryDetails({ repository, showLink = false }: {
    repository: NonNullable<CardType["repository"]>;
    showLink?: boolean;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            {showLink && <a href={`https://github.com/${repository.fullName}`} target="_blank" rel="noreferrer"
                            className="text-sm break-all underline underline-offset-4">
                {repository.fullName} ↗
            </a>}
            {repository.description && <p className="line-clamp-3 text-sm text-muted-foreground">{repository.description}</p>}
            <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{repository.private ? "Private" : "Public"}</Badge>
                {repository.archived && <Badge variant="outline">Archived</Badge>}
                {repository.fork && <Badge variant="outline">Fork</Badge>}
                {repository.language && <Badge variant="outline">{repository.language}</Badge>}
            </div>
        </div>
    );
}
