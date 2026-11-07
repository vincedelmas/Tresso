import authClient from "~/lib/utils/auth-client";
import {Input} from "~/lib/client/components/ui/input";
import type {ColumnWithCards} from "~/lib/types/types";
import {Button} from "~/lib/client/components/ui/button";
import {Column} from "~/lib/client/components/board/Column";
import {Checkbox} from "~/lib/client/components/ui/checkbox";
import {ArrowLeft, GripVertical, LogOut} from "lucide-react";
import {Separator} from "~/lib/client/components/ui/separator";
import {useDragScroll} from "~/lib/client/hooks/use-drag-scroll";
import {NewColumn} from "~/lib/client/components/board/NewColumn";
import React, {useCallback, useMemo, useRef, useState} from "react";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {EditableText} from "~/lib/client/components/board/EditableText";
import {GithubDialog} from "~/lib/client/components/board/GithubDialog";
import {useUpdateBoardMutation} from "~/lib/client/react-query/mutations";
import {createFileRoute, Link, useNavigate, useRouter} from "@tanstack/react-router";
import {authOptions, boardDetailsOptions} from "~/lib/client/react-query/query-options";
import {Field, FieldLabel, FieldLegend, FieldSet} from "~/lib/client/components/ui/field";


export const Route = createFileRoute("/_private/board/$boardId")({
    params: { parse: ({ boardId }) => ({ boardId: Number(boardId) }) },
    loader: ({ context: { queryClient }, params: { boardId } }) => {
        return queryClient.query({ ...boardDetailsOptions(boardId), staleTime: "static" });
    },
    component: BoardPage,
})


function BoardPage() {
    const router = useRouter();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { boardId } = Route.useParams();
    const newColumnAddedRef = useRef(false);
    const [search, setSearch] = useState("");
    const boardNameEditState = useState(false);
    const updateBoardMutation = useUpdateBoardMutation();
    const [privateOnly, setPrivateOnly] = useState(false);
    const [archivedOnly, setArchivedOnly] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const boardData = useSuspenseQuery(boardDetailsOptions(boardId)).data;

    const dragScroll = useDragScroll(scrollContainerRef);

    const changeBoardNameHandler = (newName: string) => {
        updateBoardMutation.mutate({ data: { id: boardData.id, name: newName } });
    };

    const handleLogout = async () => {
        await authClient.signOut();
        await router.invalidate();
        queryClient.setQueryData(authOptions.queryKey, null);
        await navigate({ to: "/", replace: true });
        queryClient.removeQueries();
    }

    const scrollToEnd = useCallback(() => {
        if (!scrollContainerRef.current) return;
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }, []);

    const columnRef = useCallback(() => {
        if (!scrollContainerRef.current || !newColumnAddedRef.current) return;

        scrollToEnd();
        newColumnAddedRef.current = false;
    }, [scrollToEnd]);

    const columns = useMemo(() => {
        const columnsMap = new Map<number, ColumnWithCards>();

        for (const column of boardData.columns) {
            columnsMap.set(column.id, { ...column, cards: [] });
        }

        const searchTerm = search.toLowerCase();

        for (const card of boardData.cards) {
            const text = [
                card.title,
                card.content,
                card.repository?.fullName,
                card.repository?.description,
                ...card.labels.map(label => label.name),
            ].join(" ").toLowerCase();

            if (
                !text.includes(searchTerm) ||
                (privateOnly && !card.repository?.private) ||
                (archivedOnly && !card.repository?.archived)
            ) continue;

            const column = columnsMap.get(card.columnId);
            column?.cards.push(card);
        }

        return [...columnsMap.values()].sort((a, b) => a.order - b.order);
    }, [boardData.cards, boardData.columns, search, privateOnly, archivedOnly]);

    return (
        <main className="flex h-screen flex-col overflow-hidden">
            <title>{`${boardData.name} - Tresso`}</title>

            <header className="flex shrink-0 items-center justify-between border-b bg-background/75 px-4 py-3 backdrop-blur-xl sm:px-6">
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <span className="hidden size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background sm:grid">
                        <GripVertical/>
                    </span>
                    <Button size="sm" variant="ghost" nativeButton={false} render={<Link to="/boards"/>}>
                        <ArrowLeft data-icon="inline-start"/> Boards
                    </Button>
                    <Separator orientation="vertical" className="h-5"/>
                    <h1 className="min-w-0 font-heading text-lg font-medium tracking-tight sm:text-xl">
                        <EditableText
                            fieldName="name"
                            editState={boardNameEditState}
                            onChange={changeBoardNameHandler}
                            buttonClass="h-8 max-w-[45vw] justify-start truncate px-1.5 text-lg font-medium sm:text-xl"
                            inputClass="h-8 max-w-[45vw] rounded-lg border border-input bg-input/30 px-2 text-lg font-medium outline-none
                                focus:border-ring focus:ring-3 focus:ring-ring/50 sm:text-xl"
                            value={(updateBoardMutation.isPending && updateBoardMutation.variables.data.name)
                                ? updateBoardMutation.variables.data.name
                                : boardData.name
                            }
                        />
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <GithubDialog board={boardData}/>
                    <Button size="sm" variant="ghost" onClick={handleLogout} className="shrink-0">
                        <LogOut data-icon="inline-start"/>{" "}
                        <span className="hidden sm:inline">Sign out</span>
                    </Button>
                </div>
            </header>

            {(boardData.github || boardData.cards.some(card => card.repository)) &&
                <div className="flex shrink-0 flex-wrap items-center gap-4 border-b px-4 py-2 sm:px-6">
                    <Input
                        value={search}
                        className="w-full sm:w-72"
                        aria-label="Search cards and repositories"
                        onChange={(ev) => setSearch(ev.target.value)}
                        placeholder="Search repositories, notes, labels…"
                    />

                    <FieldSet className="flex-row items-center gap-4">
                        <FieldLegend className="sr-only">
                            Repo filters
                        </FieldLegend>
                        <Field orientation="horizontal" className="w-auto">
                            <Checkbox id="private-repositories" checked={privateOnly} onCheckedChange={setPrivateOnly}/>
                            <FieldLabel htmlFor="private-repositories">
                                Private
                            </FieldLabel>
                        </Field>
                        <Field orientation="horizontal" className="w-auto">
                            <Checkbox id="archived-repositories" checked={archivedOnly} onCheckedChange={setArchivedOnly}/>
                            <FieldLabel htmlFor="archived-repositories">
                                Archived
                            </FieldLabel>
                        </Field>
                    </FieldSet>
                </div>
            }

            <div ref={scrollContainerRef} className="flex min-h-0 grow flex-col overflow-x-auto">
                <div {...dragScroll} className="flex h-full min-h-0 w-fit grow items-start gap-3 px-4 py-5 sm:px-6">
                    {columns.map((col, idx) =>
                        <Column
                            col={col}
                            key={col.id}
                            ref={columnRef}
                            columns={columns}
                            nextColumnId={columns[idx + 1]?.id}
                            previousColumnId={columns[idx - 1]?.id}
                        />
                    )}
                    <NewColumn
                        boardId={boardData.id}
                        onExpand={scrollToEnd}
                        editInitially={columns.length === 0}
                        onNewColumnAdded={() => (newColumnAddedRef.current = true)}
                    />
                    <div className="h-1 w-3 shrink-0"/>
                </div>
            </div>
        </main>
    );
}
