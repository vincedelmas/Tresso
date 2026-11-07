import {toast} from "~/lib/client/components/ui/toast";
import {flushSync} from "react-dom";
import {cn} from "~/lib/utils/utils";
import {Card} from "~/lib/client/components/board/Card";
import {Button} from "~/lib/client/components/ui/button";
import {NewCard} from "~/lib/client/components/board/NewCard";
import {EditableText} from "~/lib/client/components/board/EditableText";
import {DeleteConfirmationDialog} from "~/lib/client/components/DeleteConfirmationDialog";
import {ChevronLeft, ChevronRight, Ellipsis, Plus, Trash2} from "lucide-react";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CardSelection, CardTransferType, ColTransferType, ColumnWithCards, CONTENT_TYPES} from "~/lib/types/types";
import {useDeleteColumnMutation, useMoveCardMutation, useMoveColumnMutation, useUpdateColumnMutation} from "~/lib/client/react-query/mutations";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from "~/lib/client/components/ui/dropdown-menu";


interface ColumnProps {
    col: ColumnWithCards;
    selection: CardSelection | null;
    onSelectCard: (cardId: number) => void;
    nextColumnId?: number;
    previousColumnId?: number;
    columns: ColumnWithCards[];
    ref: React.Ref<HTMLDivElement>;
}


export const Column = ({ ref, col, columns, selection, onSelectCard, previousColumnId, nextColumnId }: ColumnProps) => {
    const didMountRef = useRef(false);
    const listRef = useRef<HTMLUListElement>(null!);
    const colNameEditState = useState(false);
    const [newCardEdit, setNewCardEdit] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [acceptCardDrop, setAcceptCardDrop] = useState(false);
    const [acceptColDrop, setAcceptColDrop] = useState<"none" | "left" | "right">("none");

    const moveCardMutation = useMoveCardMutation(col.boardId);
    const moveColumnMutation = useMoveColumnMutation(col.boardId);
    const deleteColumnMutation = useDeleteColumnMutation(col.boardId);
    const updateColumnMutation = useUpdateColumnMutation(col.boardId);

    const isColumnPending = updateColumnMutation.isPending || moveColumnMutation.isPending || deleteColumnMutation.isPending;

    useEffect(() => {
        didMountRef.current = true;
    }, []);

    const cardRef = useCallback((node: HTMLElement | null) => {
        if (!didMountRef.current || !node) return;
        node.scrollIntoView({ block: "center" });
    }, []);

    const sortedCards = useMemo(() => {
        return [...col.cards].sort((a, b) => a.order - b.order);
    }, [col.cards]);

    const onDropHandler = (ev: React.DragEvent) => {
        const transfer = JSON.parse(ev.dataTransfer.getData(CONTENT_TYPES.column) || "null") as ColTransferType;
        if (!transfer || acceptColDrop === "none") return;

        moveColumnMutation.mutate({
            data: {
                id: transfer.id,
                targetColumnId: col.id,
                placement: acceptColDrop === "left" ? "before" : "after",
            },
        });
        setAcceptColDrop("none");
    }

    const onDragOverHandler = (ev: React.DragEvent) => {
        if (!ev.dataTransfer.types.includes(CONTENT_TYPES.column)) return;

        ev.preventDefault();
        ev.stopPropagation();

        const rect = ev.currentTarget.getBoundingClientRect();
        const midpoint = (rect.left + rect.right) / 2;

        setAcceptColDrop(ev.clientX <= midpoint ? "left" : "right");
    }

    const onDragStartHandler = (ev: React.DragEvent) => {
        ev.dataTransfer.effectAllowed = "move";
        const data: ColTransferType = { id: col.id, name: col.name };
        ev.dataTransfer.setData(CONTENT_TYPES.column, JSON.stringify(data));
    }

    const onChangeColName = (newName: string) => {
        updateColumnMutation.mutate({ data: { id: col.id, name: newName } });
    }

    const onMoveLeftHandler = () => {
        if (previousColumnId === undefined) return;
        moveColumnMutation.mutate({
            data: { id: col.id, targetColumnId: previousColumnId, placement: "before" },
        });
    };

    const onMoveRightHandler = () => {
        if (nextColumnId === undefined) return;
        moveColumnMutation.mutate({
            data: { id: col.id, targetColumnId: nextColumnId, placement: "after" },
        });
    };

    const onAddCardClickHandler = () => {
        flushSync(() => setNewCardEdit(true));
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }

    const onDeleteHandler = () => {
        deleteColumnMutation.mutate({ data: { id: col.id } }, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                toast.add({title: "Column deleted successfully", type: "success"});
            },
        })
    }

    const cardDndProps = {
        onDragOver: (ev: React.DragEvent) => {
            if (ev.dataTransfer.types.includes(CONTENT_TYPES.card)) {
                ev.preventDefault();
                setAcceptCardDrop(true);
            }
        },
        onDrop: (ev: React.DragEvent) => {
            const transfer = JSON.parse(ev.dataTransfer.getData(CONTENT_TYPES.card) || "null") as CardTransferType;
            if (!transfer) return;

            moveCardMutation.mutate({ data: { id: transfer.id, columnId: col.id, placement: "start" } })
            setAcceptCardDrop(false);
        },
        onDragLeave: () => {
            setAcceptCardDrop(false);
        },
    };

    return (
        <>
        <div
            ref={ref}
            onDrop={onDropHandler}
            onDragOver={onDragOverHandler}
            onDragLeave={() => setAcceptColDrop("none")}
            className={cn(
                "flex max-h-full min-h-0 shrink-0 flex-col border-x-2 border-transparent",
                acceptColDrop === "left"
                    ? "border-l-foreground/55 border-r-transparent"
                    : acceptColDrop === "right"
                        ? "border-r-foreground/55 border-l-transparent"
                        : "",
            )}
        >
            <div
                onDragStart={onDragStartHandler}
                {...(col.cards.length ? {} : cardDndProps)}
                draggable={!colNameEditState[0] && !isColumnPending && !selection}
                className={cn(
                    "group relative flex max-h-full min-h-0 w-80 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/12 backdrop-blur-sm",
                    acceptCardDrop && "ring-2 ring-foreground/45",
                )}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5 pb-1.5" {...(col.cards.length ? cardDndProps : {})}>
                    <EditableText
                        fieldName="name"
                        buttonClass="h-7 max-w-56 justify-start truncate px-1.5 font-medium"
                        onChange={onChangeColName}
                        editState={colNameEditState}
                        inputClass="h-7 w-56 rounded-lg border border-input bg-input/30 px-2 text-sm font-medium outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                        value={(updateColumnMutation.isPending && updateColumnMutation.variables.data.name)
                            ? updateColumnMutation.variables.data.name : col.name
                        }
                    />
                    <div className="flex items-center gap-1">
                        <span className="min-w-5 text-center text-xs tabular-nums text-muted-foreground">{sortedCards.length}</span>
                        <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Options for ${col.name}`}
                                    disabled={deleteColumnMutation.isPending}
                                    onPointerDown={(event) => event.stopPropagation()}
                                />
                            }
                        >
                            <Ellipsis/>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={onMoveLeftHandler} disabled={isColumnPending || previousColumnId === undefined}>
                                    <ChevronLeft/> Move left
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onMoveRightHandler} disabled={isColumnPending || nextColumnId === undefined}>
                                    <ChevronRight/> Move right
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator/>
                            <DropdownMenuGroup>
                                <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isColumnPending}>
                                    <Trash2/> Delete column
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                </div>
                <ul ref={listRef} className="min-h-0 grow overflow-y-auto overscroll-contain px-1 py-1.5">
                    {sortedCards.map((card, idx, cards) =>
                        <Card
                            card={card}
                            selection={selection}
                            onSelectCard={onSelectCard}
                            ref={cardRef}
                            key={card.id}
                            columns={columns}
                            columnId={col.id}
                            nextCardId={cards[idx + 1]?.id}
                            previousCardId={cards[idx - 1]?.id}
                        />
                    )}
                </ul>
                {newCardEdit ?
                    <NewCard
                        columnId={col.id}
                        boardId={col.boardId}
                        onComplete={() => setNewCardEdit(false)}
                        onCancel={() => {
                            flushSync(() => setNewCardEdit(false));
                            listRef.current.scrollTop = 0;
                        }}
                    />
                    :
                    <div className="shrink-0 border-t p-2" {...(col.cards.length ? cardDndProps : {})}>
                        <Button className="w-full justify-start text-muted-foreground" variant="ghost" onClick={onAddCardClickHandler} disabled={deleteColumnMutation.isPending}>
                            <Plus data-icon="inline-start"/> Add card
                        </Button>
                    </div>
                }
            </div>
        </div>
        <DeleteConfirmationDialog
            open={isDeleteDialogOpen}
            title="Delete this column?"
            isPending={deleteColumnMutation.isPending}
            onConfirm={onDeleteHandler}
            onOpenChange={setIsDeleteDialogOpen}
            description={`“${col.name}” and every card inside it will be permanently deleted.`}
        />
        </>
    );
}
