import authClient from "~/lib/utils/auth-client";
import {DEFAULT_BOARD_FILTERS, type BoardFilters, type ColumnWithCards} from "~/lib/types/types";
import {Button} from "~/lib/client/components/ui/button";
import {Column} from "~/lib/client/components/board/Column";
import {ArrowLeft, GripVertical, LogOut} from "lucide-react";
import {Separator} from "~/lib/client/components/ui/separator";
import {useDragScroll} from "~/lib/client/hooks/use-drag-scroll";
import {NewColumn} from "~/lib/client/components/board/NewColumn";
import React, {useCallback, useMemo, useRef, useState} from "react";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {EditableText} from "~/lib/client/components/board/EditableText";
import {GithubDialog} from "~/lib/client/components/board/GithubDialog";
import {BoardToolbar} from "~/lib/client/components/board/BoardToolbar";
import {useBulkUpdateCardsMutation, useUpdateBoardMutation} from "~/lib/client/react-query/mutations";
import {createFileRoute, Link, useNavigate, useRouter} from "@tanstack/react-router";
import {authOptions, boardDetailsOptions} from "~/lib/client/react-query/query-options";


export const Route = createFileRoute("/_private/board/$boardId")({
    params: { parse: ({ boardId }) => ({ boardId: Number(boardId) }) },
    loader: ({ context: { queryClient }, params: { boardId } }) => {
        return queryClient.query({ ...boardDetailsOptions(boardId), staleTime: "static" });
    },
    component: BoardPage,
    remountDeps: ({ params }) => params.boardId,
})


function BoardPage() {
    const router = useRouter();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { boardId } = Route.useParams();
    const newColumnAddedRef = useRef(false);
    const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
    const bulkUpdateMutation = useBulkUpdateCardsMutation(boardId);
    const boardNameEditState = useState(false);
    const updateBoardMutation = useUpdateBoardMutation();
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

        const searchTerm = filters.search.toLowerCase();
        const labelIds = filters.labelIds.filter(id => boardData.labels.some(label => label.id === id));

        for (const card of boardData.cards) {
            const text = [
                card.title,
                card.content,
                card.repository?.fullName,
                card.repository?.description,
                ...card.labels.map(label => label.name),
            ].join(" ").toLowerCase();

            if (!text.includes(searchTerm)) continue;
            if (labelIds.length > 0 && !card.labels.some(label => labelIds.includes(label.id))) continue;

            if (boardData.github) {
                const repo = card.repository;
                if (filters.archivedOnly && !repo?.archived) continue;

                if (filters.publicOnly || filters.privateOnly) {
                    if (!repo || !(repo.private ? filters.privateOnly : filters.publicOnly)) continue;
                }
            }

            const column = columnsMap.get(card.columnId);
            column?.cards.push(card);
        }

        return [...columnsMap.values()].sort((a, b) => a.order - b.order);
    }, [boardData, filters]);

    const cardIds = new Set(boardData.cards.map(card => card.id));
    const selectedIds = new Set(selectedCardIds.filter(id => cardIds.has(id)));
    const visibleCardIds = columns.flatMap(column => column.cards.map(card => card.id));

    const selection = selectionMode ? {
        selectedIds,
        isPending: bulkUpdateMutation.isPending,
        onToggle: (cardId: number) => setSelectedCardIds(ids => ids.includes(cardId)
            ? ids.filter(id => id !== cardId)
            : [...ids, cardId]
        ),
    } : null;

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

            <BoardToolbar
                board={boardData}
                filters={filters}
                onFiltersChange={setFilters}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                visibleCardIds={visibleCardIds}
                isPending={bulkUpdateMutation.isPending}
                onSelectionModeChange={(enabled) => {
                    setSelectionMode(enabled);
                    setSelectedCardIds([]);
                }}
                onSelectVisible={() => setSelectedCardIds(ids => visibleCardIds.every(id => selectedIds.has(id))
                    ? ids.filter(id => !visibleCardIds.includes(id))
                    : [...new Set([...ids, ...visibleCardIds])]
                )}
                onAddLabel={(labelId) => bulkUpdateMutation.mutate({
                    data: { action: "label", boardId, cardIds: [...selectedIds], labelId },
                })}
                onRemoveLabel={(labelId) => bulkUpdateMutation.mutate({
                    data: { action: "remove-label", boardId, cardIds: [...selectedIds], labelId },
                })}
                onMove={(columnId) => bulkUpdateMutation.mutate({
                    data: { action: "move", boardId, cardIds: [...selectedIds], columnId },
                })}
            />

            <div ref={scrollContainerRef} className="flex min-h-0 grow flex-col overflow-x-auto">
                <div {...dragScroll} className="flex h-full min-h-0 w-fit grow items-start gap-3 px-4 py-5 sm:px-6">
                    {columns.map((col, idx) =>
                        <Column
                            col={col}
                            selection={selection}
                            onSelectCard={(cardId) => {
                                setSelectionMode(true);
                                setSelectedCardIds([cardId]);
                            }}
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
