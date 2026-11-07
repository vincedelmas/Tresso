import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {GitFork, LoaderCircle, RefreshCw} from "lucide-react";
import type {BoardType} from "~/lib/types/types";
import {disconnectGithub, listGithubRepositories, syncGithubRepositories} from "~/lib/server/functions/github";
import {boardDetailsOptions, boardsListOptions} from "~/lib/client/react-query/query-options";
import {Button} from "~/lib/client/components/ui/button";
import {Input} from "~/lib/client/components/ui/input";
import {Checkbox} from "~/lib/client/components/ui/checkbox";
import {Badge} from "~/lib/client/components/ui/badge";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "~/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "~/lib/client/components/ui/dialog";
import {toast} from "~/lib/client/components/ui/toast";

export function GithubDialog({ board }: { board: BoardType }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" aria-label="GitHub repositories"/>}>
                <GitFork data-icon="inline-start"/><span className="hidden sm:inline">GitHub</span>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>GitHub repositories</DialogTitle>
                    <DialogDescription>
                        Import repositories into Inbox, then organize them with columns and labels.
                        Refresh keeps your card titles, notes, labels, and positions.
                    </DialogDescription>
                </DialogHeader>
                {open && <GithubSettings board={board}/>}
            </DialogContent>
        </Dialog>
    );
}

function GithubSettings({ board }: { board: BoardType }) {
    const queryClient = useQueryClient();
    const [token, setToken] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<number[]>([]);
    const [repositories, setRepositories] = useState<Awaited<ReturnType<typeof listGithubRepositories>> | null>(null);
    const linkedIds = new Set(board.cards.flatMap(card => card.repository ? [card.repository.repositoryId] : []));

    const invalidate = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: boardDetailsOptions(board.id).queryKey }),
        queryClient.invalidateQueries({ queryKey: boardsListOptions.queryKey }),
    ]);
    const list = useMutation({
        mutationFn: () => listGithubRepositories({ data: { boardId: board.id, token: token.trim() || undefined } }),
        onSuccess: async repos => {
            setToken("");
            setSelected([]);
            setRepositories(repos);
            await invalidate();
        },
    });
    const sync = useMutation({
        mutationFn: (repositoryIds: number[]) => syncGithubRepositories({ data: { boardId: board.id, repositoryIds } }),
        onSuccess: async result => {
            setSelected([]);
            await invalidate();
            toast.add({
                title: `${result.imported} imported, ${result.refreshed} refreshed`,
                description: result.unavailable ? `${result.unavailable} repositories were not returned by GitHub; their cards were kept.` : undefined,
                type: "success",
            });
        },
    });
    const disconnect = useMutation({
        mutationFn: () => disconnectGithub({ data: { boardId: board.id } }),
        onSuccess: async () => {
            setRepositories(null);
            setSelected([]);
            setToken("");
            await invalidate();
        },
    });
    const busy = list.isPending || sync.isPending || disconnect.isPending;
    const visible = repositories?.filter(repo => repo.fullName.toLowerCase().includes(search.toLowerCase()));
    const newVisible = visible?.filter(repo => !linkedIds.has(repo.repositoryId)) ?? [];

    return (
        <div className="flex flex-col gap-5">
            <form onSubmit={event => { event.preventDefault(); list.mutate(); }}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="github-token">{board.github ? "Replace token (optional)" : "Personal access token"}</FieldLabel>
                        <Input id="github-token" type="password" autoComplete="off" value={token}
                               maxLength={1000} onChange={event => setToken(event.target.value)}
                               placeholder={board.github ? "Leave blank to use saved token" : "github_pat_…"}
                               required={!board.github} disabled={busy}/>
                        <FieldDescription>
                            Use a fine-grained token with read-only Metadata access to the repositories you want.
                            The token is encrypted on the server using the app secret.
                            {" "}<a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="underline">Create a token</a>.
                        </FieldDescription>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={busy}>
                            {list.isPending && <LoaderCircle data-icon="inline-start" className="animate-spin"/>}
                            {token.trim() ? "Save token & load repositories" : "Load repositories"}
                        </Button>
                        {board.github && <Button type="button" variant="outline" disabled={busy} onClick={() => sync.mutate([])}>
                            <RefreshCw data-icon="inline-start" className={sync.isPending ? "animate-spin" : undefined}/> Refresh imported
                        </Button>}
                    </div>
                </FieldGroup>
            </form>
            {board.github?.syncedAt && <p className="text-sm text-muted-foreground">
                Last refreshed: {new Date(board.github.syncedAt).toLocaleString()}
            </p>}
            {repositories && (
                <div className="flex flex-col gap-3">
                    <Field>
                        <FieldLabel htmlFor="repository-search">Find repositories</FieldLabel>
                        <Input id="repository-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search owner/name"/>
                    </Field>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">{selected.length} selected</p>
                        <Button size="sm" variant="ghost" disabled={busy || !newVisible.length} onClick={() => {
                            const allSelected = newVisible.every(repo => selected.includes(repo.repositoryId));
                            const visibleIds = new Set(newVisible.map(repo => repo.repositoryId));
                            setSelected(allSelected ? selected.filter(id => !visibleIds.has(id)) : [...new Set([...selected, ...visibleIds])]);
                        }}>Select / clear visible</Button>
                    </div>
                    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                        {visible?.map(repo => (
                            <Field key={repo.repositoryId} orientation="horizontal">
                                <Checkbox id={`repository-${repo.repositoryId}`} disabled={busy || linkedIds.has(repo.repositoryId)}
                                          checked={selected.includes(repo.repositoryId) || linkedIds.has(repo.repositoryId)}
                                          onCheckedChange={checked => setSelected(ids => checked ? [...ids, repo.repositoryId] : ids.filter(id => id !== repo.repositoryId))}/>
                                <FieldLabel htmlFor={`repository-${repo.repositoryId}`} className="min-w-0 flex-wrap">
                                    <span className="break-all">{repo.fullName}</span>
                                    {repo.private && <Badge variant="secondary">Private</Badge>}
                                    {repo.archived && <Badge variant="outline">Archived</Badge>}
                                    {linkedIds.has(repo.repositoryId) && <span className="text-xs text-muted-foreground">Imported</span>}
                                </FieldLabel>
                            </Field>
                        ))}
                        {visible?.length === 0 && <p className="text-sm text-muted-foreground">No repositories found.</p>}
                    </div>
                    <Button disabled={busy || !selected.length} onClick={() => sync.mutate(selected)}>
                        {sync.isPending && <LoaderCircle data-icon="inline-start" className="animate-spin"/>}
                        Import {selected.length} into Inbox
                    </Button>
                </div>
            )}
            {board.github && <div className="flex flex-col items-start gap-1">
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => disconnect.mutate()}>Remove saved token</Button>
                <p className="text-xs text-muted-foreground">Imported cards and their metadata stay on this board.</p>
            </div>}
        </div>
    );
}
