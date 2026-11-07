import {cn} from "~/lib/utils/utils";
import React, {Ref, useState} from "react";
import {toast} from "~/lib/client/components/ui/toast";
import {Badge} from "~/lib/client/components/ui/badge";
import {Button} from "~/lib/client/components/ui/button";
import {EditCardDialog} from "~/lib/client/components/edit-card/EditCardDialog";
import {RepoDetails} from "~/lib/client/components/board/RepoDetails";
import {DeleteConfirmationDialog} from "~/lib/client/components/DeleteConfirmationDialog";
import {CardTransferType, CardType, ColumnWithCards, CONTENT_TYPES} from "~/lib/types/types";
import {useDeleteCardMutation, useMoveCardMutation} from "~/lib/client/react-query/mutations";
import {ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Ellipsis, ExternalLink, MessageSquareMore, Pencil, Trash2} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "~/lib/client/components/ui/dropdown-menu";


interface CardProps {
    card: CardType,
    columnId: number;
    nextCardId?: number;
    ref: Ref<HTMLLIElement>;
    previousCardId?: number;
    columns: ColumnWithCards[];
}


export const Card = ({ card, columns, columnId, nextCardId, previousCardId, ref }: CardProps) => {
    const moveCardMutation = useMoveCardMutation(card.boardId);
    const deleteCardMutation = useDeleteCardMutation(card.boardId);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">("none");

    const isPending = moveCardMutation.isPending || deleteCardMutation.isPending;

    const onDropHandler = (ev: React.DragEvent) => {
        ev.stopPropagation();

        const transfer = JSON.parse(ev.dataTransfer.getData(CONTENT_TYPES.card) || "null") as CardTransferType;
        if (!transfer || acceptDrop === "none") return;

        moveCardMutation.mutate({
            data: {
                columnId,
                id: transfer.id,
                targetCardId: card.id,
                placement: acceptDrop === "top" ? "before" : "after",
            }
        });

        setAcceptDrop("none");
    };

    const onDragOverHandler = (ev: React.DragEvent) => {
        if (!ev.dataTransfer.types.includes(CONTENT_TYPES.card)) return;

        ev.preventDefault();
        ev.stopPropagation();

        const rect = ev.currentTarget.getBoundingClientRect();
        const midpoint = (rect.top + rect.bottom) / 2;

        setAcceptDrop(ev.clientY <= midpoint ? "top" : "bottom");
    };

    const onDragStartHandler = (ev: React.DragEvent) => {
        ev.dataTransfer.effectAllowed = "move";

        const data: CardTransferType = { id: card.id, title: card.title };
        ev.dataTransfer.setData(CONTENT_TYPES.card, JSON.stringify(data));

        ev.stopPropagation();
    };

    const openEditDialog = () => {
        setIsEditDialogOpen(true);
    };

    const stopCardClick = (ev: React.SyntheticEvent) => {
        ev.stopPropagation();
    };

    const moveCard = (placement: "start" | "end", targetColumnId = columnId) => {
        moveCardMutation.mutate({
            data: {
                placement,
                id: card.id,
                columnId: targetColumnId,
            }
        });
    };

    const onMoveUpHandler = () => {
        if (previousCardId === undefined) return;
        moveCardMutation.mutate({
            data: {
                columnId,
                id: card.id,
                placement: "before",
                targetCardId: previousCardId,
            },
        });
    };

    const onMoveDownHandler = () => {
        if (nextCardId === undefined) return;
        moveCardMutation.mutate({
            data: {
                columnId,
                id: card.id,
                placement: "after",
                targetCardId: nextCardId,
            },
        });
    };

    const onMoveToColHandler = (targetColumn: ColumnWithCards) => {
        moveCard("start", targetColumn.id);
    };

    const onDeleteHandler = () => {
        deleteCardMutation.mutate({ data: { id: card.id } }, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                toast.add({ title: "Card deleted successfully", type: "success" });
            },
        });
    };

    return (
        <>
            <li
                ref={ref}
                onDrop={onDropHandler}
                onDragOver={onDragOverHandler}
                onDragLeave={() => setAcceptDrop("none")}
                className={cn("-mb-px border-y-2 border-transparent px-1.5 py-1",
                    acceptDrop === "top" ? "border-t-foreground/55 border-b-transparent" :
                        acceptDrop === "bottom" ? "border-b-foreground/55 border-t-transparent" : ""
                )}
            >
                <div
                    draggable={!isPending}
                    onDragStart={onDragStartHandler}
                    className="group relative min-h-16 rounded-lg bg-background/75 text-sm ring-1 ring-foreground/8 transition-colors
                    hover:bg-background"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={openEditDialog}
                        className="block h-auto min-h-16 w-full rounded-lg px-3 py-3 pr-9 text-left font-normal whitespace-normal
                        hover:bg-transparent focus-visible:ring-2"
                    >
                        <div className="flex h-full flex-col">
                            {card.labels.length > 0 &&
                                <div className="mb-2 flex flex-wrap gap-1">
                                    {card.labels.map((label) =>
                                        <Badge
                                            key={label.id}
                                            style={{ backgroundColor: label.color }}
                                            className="h-4 border-0 px-1.5 text-[10px] text-black/80 shadow-none"
                                        >
                                            {label.name}
                                        </Badge>
                                    )}
                                </div>
                            }

                            <h3 className="my-0 leading-5 whitespace-pre-wrap wrap-break-word text-foreground/90">
                                {card.title}
                            </h3>

                            {card.repository &&
                                <div className="mt-2">
                                    <RepoDetails
                                        repository={card.repository}
                                    />
                                </div>
                            }

                            <div className="mt-auto flex grow items-end">
                                {card.content &&
                                    <MessageSquareMore
                                        className="mt-2 text-muted-foreground"
                                    />
                                }
                            </div>
                        </div>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    title="Card options"
                                    onClick={(ev) => ev.stopPropagation()}
                                    onPointerDown={(ev) => ev.stopPropagation()}
                                    className="absolute top-1.5 right-1.5 text-muted-foreground"
                                />
                            }
                        >
                            <Ellipsis/>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52" onClick={stopCardClick} onPointerDown={stopCardClick}>
                            <DropdownMenuGroup>
                                {card.repository &&
                                    <DropdownMenuItem
                                        render={
                                            <a
                                                target="_blank"
                                                rel="noreferrer"
                                                href={`https://github.com/${card.repository.fullName}`}
                                            />
                                        }
                                    >
                                        <ExternalLink/> Open on GitHub
                                    </DropdownMenuItem>
                                }
                                <DropdownMenuItem disabled={isPending} onClick={openEditDialog}>
                                    <Pencil/> Edit card
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator/>
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => moveCard("start")} disabled={isPending || previousCardId === undefined}>
                                    <ArrowUpToLine/> Move to top
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onMoveUpHandler} disabled={isPending || previousCardId === undefined}>
                                    <ArrowUp/> Move up
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onMoveDownHandler} disabled={isPending || nextCardId === undefined}>
                                    <ArrowDown/> Move down
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => moveCard("end")} disabled={isPending || nextCardId === undefined}>
                                    <ArrowDownToLine/> Move to bottom
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuGroup>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={isPending || columns.length <= 1}>
                                        Move to column
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-52 max-w-64" onClick={stopCardClick} onPointerDown={stopCardClick}>
                                        <DropdownMenuGroup>
                                            {columns
                                                .filter((targetColumn) => targetColumn.id !== columnId)
                                                .map((targetColumn) =>
                                                    <DropdownMenuItem key={targetColumn.id} onClick={() => onMoveToColHandler(targetColumn)}>
                                                        <span className="truncate">
                                                            {targetColumn.name}
                                                        </span>
                                                    </DropdownMenuItem>
                                                )
                                            }
                                        </DropdownMenuGroup>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator/>
                            <DropdownMenuGroup>
                                <DropdownMenuItem disabled={isPending} onClick={() => setIsDeleteDialogOpen(true)} variant="destructive">
                                    <Trash2/> Delete card
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </li>

            <EditCardDialog
                card={card}
                isDialogOpen={isEditDialogOpen}
                setDialogOpen={setIsEditDialogOpen}
            />

            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                title="Delete this card?"
                onConfirm={onDeleteHandler}
                onOpenChange={setIsDeleteDialogOpen}
                isPending={deleteCardMutation.isPending}
                description={`“${card.title}” will be permanently deleted.`}
            />
        </>
    );
}
