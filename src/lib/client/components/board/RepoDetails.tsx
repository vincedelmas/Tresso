import {ArrowUpRight} from "lucide-react";
import type {CardType} from "~/lib/types/types";
import {Badge} from "~/lib/client/components/ui/badge";


interface RepoDetailsProps {
    showLink?: boolean;
    repository: NonNullable<CardType["repository"]>;
}


export function RepoDetails({ repository, showLink = false }: RepoDetailsProps) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            {showLink &&
                <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://github.com/${repository.fullName}`}
                    className="flex items-center gap-1 text-sm underline underline-offset-4"
                >
                    <span className="break-all">
                        {repository.fullName.split("/")[1]}
                    </span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden="true"/>
                </a>
            }

            {repository.description &&
                <p className="line-clamp-3 text-sm text-muted-foreground">
                    {repository.description}
                </p>
            }

            <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">
                    {repository.private ? "Private" : "Public"}
                </Badge>
                {repository.archived &&
                    <Badge variant="outline">
                        Archived
                    </Badge>
                }
                {repository.fork &&
                    <Badge variant="outline">
                        Fork
                    </Badge>
                }
                {repository.language &&
                    <Badge variant="outline">
                        {repository.language}
                    </Badge>
                }
            </div>
        </div>
    );
}
