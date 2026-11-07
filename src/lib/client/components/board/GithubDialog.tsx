import {useState} from "react";
import type {BoardType} from "~/lib/types/types";
import {toast} from "~/lib/client/components/ui/toast";
import {Badge} from "~/lib/client/components/ui/badge";
import {Input} from "~/lib/client/components/ui/input";
import {Button} from "~/lib/client/components/ui/button";
import {Checkbox} from "~/lib/client/components/ui/checkbox";
import {GitFork, LoaderCircle, RefreshCw} from "lucide-react";
import {Separator} from "~/lib/client/components/ui/separator";
import {ScrollArea} from "~/lib/client/components/ui/scroll-area";
import type {listGithubRepos} from "~/lib/server/functions/github";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "~/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "~/lib/client/components/ui/dialog";
import {useDisconnectGithubMutation, useListGithubReposMutation, useSyncGithubReposMutation} from "~/lib/client/react-query/mutations";


interface GithubDialogProps {
    board: BoardType;
}


export function GithubDialog({ board }: GithubDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" aria-label="GitHub repositories"/>}>
                <GitFork data-icon="inline-start"/>
                <span className="hidden sm:inline">
                    GitHub
                </span>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        GitHub repositories
                    </DialogTitle>
                    <DialogDescription>
                        Import repositories into Inbox, then organize them with columns and labels.
                        Refresh keeps your card titles, notes, labels, and positions.
                    </DialogDescription>
                </DialogHeader>

                {open &&
                    <GithubSettings
                        board={board}
                    />
                }
            </DialogContent>
        </Dialog>
    );
}


function GithubSettings({ board }: GithubDialogProps) {
    const [token, setToken] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<number[]>([]);
    const listMutation = useListGithubReposMutation(board.id);
    const syncMutation = useSyncGithubReposMutation(board.id);
    const disconnectMutation = useDisconnectGithubMutation(board.id);
    const [repos, setRepos] = useState<Awaited<ReturnType<typeof listGithubRepos>> | null>(null);

    const isPending = listMutation.isPending || syncMutation.isPending || disconnectMutation.isPending;
    const linkedIds = new Set(board.cards.flatMap(card => card.repository ? [card.repository.repositoryId] : []));

    const searchTerm = search.toLowerCase();
    const visibleRepositories = repos?.filter(repo => repo.fullName.toLowerCase().includes(searchTerm)) ?? [];
    const visibleNewIds = visibleRepositories.filter(repo => !linkedIds.has(repo.repositoryId)).map(repo => repo.repositoryId);
    const allVisibleSelected = visibleNewIds.length > 0 && visibleNewIds.every(id => selected.includes(id));

    const handleSyncSuccess = (result: Awaited<ReturnType<typeof syncMutation.mutateAsync>>) => {
        setSelected([]);
        toast.add({
            type: "success",
            title: `${result.imported} imported, ${result.refreshed} refreshed`,
            description: result.unavailable
                ? `${result.unavailable} repos were not returned by GitHub; their cards were kept.`
                : undefined,
        });
    };

    return (
        <div className="flex flex-col gap-5">
            <form
                onSubmit={(ev) => {
                    ev.preventDefault();
                    if (isPending) return;

                    listMutation.mutate({ data: { boardId: board.id, token: token.trim() || undefined } }, {
                        onSuccess: (repos) => {
                            setToken("");
                            setSelected([]);
                            setRepos(repos);
                        },
                    });
                }}
            >
                <FieldGroup>
                    <Field data-disabled={isPending || undefined}>
                        <FieldLabel htmlFor="github-token">
                            {board.github ? "Replace token (optional)" : "Personal access token"}
                        </FieldLabel>
                        <Input
                            value={token}
                            type="password"
                            maxLength={1000}
                            id="github-token"
                            autoComplete="off"
                            disabled={isPending}
                            required={!board.github}
                            onChange={(event) => setToken(event.target.value)}
                            placeholder={board.github ? "Leave blank to use saved token" : "github_pat_…"}
                        />
                        <FieldDescription>
                            Use a fine-grained token with read-only Metadata access to the repositories you want.
                            Your token is stored encrypted.
                            {" "}
                            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                                Create a token
                            </a>.
                        </FieldDescription>
                    </Field>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={isPending}>
                            {listMutation.isPending &&
                                <LoaderCircle
                                    data-icon="inline-start"
                                    className="animate-spin"
                                />
                            }
                            {token.trim()
                                ? "Save token & load repos"
                                : "Load repos"
                            }
                        </Button>
                        {board.github &&
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => syncMutation.mutate({ data: { boardId: board.id, repositoryIds: [] } }, {
                                    onSuccess: handleSyncSuccess,
                                })}
                            >
                                <RefreshCw data-icon="inline-start"/>
                                Refresh imported
                            </Button>
                        }
                    </div>

                    {board.github?.syncedAt &&
                        <FieldDescription>
                            Last refreshed: {new Date(board.github.syncedAt).toLocaleString()}
                        </FieldDescription>
                    }
                </FieldGroup>
            </form>

            {repos &&
                <>
                    <Separator/>
                    <FieldSet>
                        <FieldLegend>
                            Choose repositories
                        </FieldLegend>
                        <Field>
                            <FieldLabel htmlFor="repository-search">
                                Find repositories
                            </FieldLabel>
                            <Input
                                value={search}
                                id="repository-search"
                                placeholder="Search owner/name"
                                onChange={(ev) => setSearch(ev.target.value)}
                            />
                        </Field>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground">
                                {selected.length} selected
                            </p>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPending || !visibleNewIds.length}
                                onClick={() => setSelected(ids => allVisibleSelected
                                    ? ids.filter(id => !visibleNewIds.includes(id))
                                    : [...new Set([...ids, ...visibleNewIds])]
                                )}
                            >
                                {allVisibleSelected ? "Clear visible" : "Select visible"}
                            </Button>
                        </div>

                        <ScrollArea className="h-64">
                            <FieldGroup className="gap-3 py-1 pr-3">
                                {visibleRepositories.map(repo => {
                                    const isImported = linkedIds.has(repo.repositoryId);
                                    const checkboxId = `repository-${repo.repositoryId}`;
                                    const isDisabled = isPending || isImported;

                                    return (
                                        <Field key={repo.repositoryId} orientation="horizontal" data-disabled={isDisabled || undefined}>
                                            <Checkbox
                                                id={checkboxId}
                                                disabled={isDisabled}
                                                checked={isImported || selected.includes(repo.repositoryId)}
                                                onCheckedChange={(checked) => setSelected(ids => checked
                                                    ? [...ids, repo.repositoryId]
                                                    : ids.filter(id => id !== repo.repositoryId)
                                                )}
                                            />
                                            <FieldLabel htmlFor={checkboxId} className="min-w-0 flex-wrap">
                                                <span className="break-all">
                                                    {repo.fullName}
                                                </span>
                                                {repo.private &&
                                                    <Badge variant="secondary">
                                                        Private
                                                    </Badge>
                                                }
                                                {repo.archived &&
                                                    <Badge variant="outline">
                                                        Archived
                                                    </Badge>
                                                }
                                                {isImported &&
                                                    <Badge variant="outline">
                                                        Imported
                                                    </Badge>
                                                }
                                            </FieldLabel>
                                        </Field>
                                    );
                                })}
                                {visibleRepositories.length === 0 &&
                                    <FieldDescription>
                                        No repos found.
                                    </FieldDescription>
                                }
                            </FieldGroup>
                        </ScrollArea>

                        <DialogFooter>
                            <Button
                                disabled={isPending || !selected.length}
                                onClick={() => syncMutation.mutate({ data: { boardId: board.id, repositoryIds: selected } }, {
                                    onSuccess: handleSyncSuccess,
                                })}
                            >
                                {syncMutation.isPending &&
                                    <LoaderCircle
                                        data-icon="inline-start"
                                        className="animate-spin"
                                    />
                                }
                                Import {selected.length} into Inbox
                            </Button>
                        </DialogFooter>
                    </FieldSet>
                </>
            }

            {board.github &&
                <>
                    <Separator/>
                    <Field>
                        <div>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPending}
                                onClick={() => disconnectMutation.mutate({ data: { boardId: board.id } }, {
                                    onSuccess: () => {
                                        setRepos(null);
                                        setSelected([]);
                                        setToken("");
                                    },
                                })}
                            >
                                Remove saved token
                            </Button>
                        </div>
                        <FieldDescription>
                            Imported cards and their metadata stay on this board.
                        </FieldDescription>
                    </Field>
                </>
            }
        </div>
    );
}
