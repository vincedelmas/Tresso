import {toast} from "~/lib/client/components/ui/toast";
import {useState} from "react";
import authClient from "~/lib/utils/auth-client";
import {formatUpdatedAt} from "~/lib/utils/utils";
import {Input} from "~/lib/client/components/ui/input";
import {Button} from "~/lib/client/components/ui/button";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {Card, CardHeader, CardTitle} from "~/lib/client/components/ui/card";
import {CreateBoardDialog} from "~/lib/client/components/boards/CreateBoardDialog";
import {BoardColorPicker, DEFAULT_BOARD_COLOR} from "~/lib/client/components/boards/BoardColorPicker";
import {createFileRoute, Link, useNavigate, useRouter} from "@tanstack/react-router";
import {authOptions, boardsListOptions} from "~/lib/client/react-query/query-options";
import {CalendarClock, Columns3, Ellipsis, GripVertical, Loader2, LogOut, Pencil, Tag, Trash2, WalletCards} from "lucide-react";
import {useDeleteBoardMutation, useUpdateBoardMutation} from "~/lib/client/react-query/mutations";
import {DeleteConfirmationDialog} from "~/lib/client/components/DeleteConfirmationDialog";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "~/lib/client/components/ui/field";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger} from "~/lib/client/components/ui/dropdown-menu";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "~/lib/client/components/ui/dialog";


export const Route = createFileRoute("/_private/boards")({
    loader: ({ context: { queryClient } }) => {
        return queryClient.query({ ...boardsListOptions, staleTime: "static" });
    },
    component: BoardsPage,
})


function BoardsPage() {
    const router = useRouter();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState(DEFAULT_BOARD_COLOR);
    const deleteBoardMutation = useDeleteBoardMutation();
    const updateBoardMutation = useUpdateBoardMutation();
    const boardsList = useSuspenseQuery(boardsListOptions).data;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deletingBoard, setDeletingBoard] = useState<{ id: number, name: string } | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [editingBoard, setEditingBoard] = useState<{ id: number, name: string, color: string } | null>(null);

    const handleUpdateBoard = () => {
        const trimmedName = newName.trim();
        if (editingBoard && trimmedName && (trimmedName !== editingBoard.name || newColor !== editingBoard.color)) {
            updateBoardMutation.mutate({ data: { id: editingBoard.id, name: trimmedName, color: newColor } }, {
                onSuccess: () => setIsEditModalOpen(false),
            });
            return;
        }

        setIsEditModalOpen(false);
    }

    const onDeleteBoard = (boardId: number) => {
        deleteBoardMutation.mutate({ data: { id: boardId } }, {
            onSuccess: () => {
                setDeletingBoard(null);
                toast.add({title: "Board deleted successfully", type: "success"});
            },
        });
    }

    const handleOpenEditModal = (board: { id: number; name: string; color: string }) => {
        setEditingBoard(board);
        setNewName(board.name);
        setNewColor(board.color);
        setIsEditModalOpen(true);
    }

    const handleLogout = async () => {
        await authClient.signOut();
        await router.invalidate();
        queryClient.setQueryData(authOptions.queryKey, null);
        await navigate({ to: "/", replace: true });
        queryClient.removeQueries();
    }

    return (
        <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
            <title>Your Boards - Tresso</title>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
                            <GripVertical/>
                        </span>
                        <span className="font-heading text-base font-medium tracking-tight">Tresso</span>
                    </div>
                    <Button variant="ghost" onClick={handleLogout}>
                        <LogOut data-icon="inline-start"/> Sign out
                    </Button>
                </header>

                <section className="flex flex-col gap-3 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Workspace</p>
                        <h1 className="font-heading text-3xl font-medium tracking-[-0.03em] sm:text-4xl">Your boards</h1>
                        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                            Open a board or create a new space for the next piece of work.
                        </p>
                    </div>
                    <span className="w-fit rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-foreground/8">
                        {boardsList.length} {boardsList.length === 1 ? "board" : "boards"}
                    </span>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {boardsList.map((board) =>
                        <article key={board.id} className="relative">
                            <Link
                                to="/board/$boardId"
                                params={{ boardId: board.id }}
                                className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                                <Card
                                    style={{ backgroundColor: board.color }}
                                    className="board-surface h-52 rounded-2xl bg-transparent py-0 text-white shadow-[0_20px_55px_-36px_rgb(0_0_0/0.95)] ring-0 transition-[filter,box-shadow] duration-200 hover:brightness-[1.04] hover:shadow-[0_24px_65px_-36px_rgb(0_0_0/1)]"
                                >
                                    <CardHeader className="grid h-full grid-cols-1 grid-rows-[auto_1fr_auto] gap-0 p-0">
                                        <div className="flex items-center gap-1.5 px-5 pt-5 pr-14 text-xs text-white/65" title="Last updated">
                                            <CalendarClock className="size-3.5"/>
                                            <span className="truncate">Updated {formatUpdatedAt(board.updatedAt)}</span>
                                        </div>

                                        <CardTitle className="line-clamp-3 self-center px-5 py-4 text-2xl leading-tight font-medium tracking-[-0.025em] text-white">
                                            {board.name}
                                        </CardTitle>

                                        <div className="flex items-center gap-5 bg-black/15 px-5 py-3.5 text-xs text-white/80 backdrop-blur-sm">
                                            <span className="inline-flex items-center gap-1.5" title="Columns">
                                                <Columns3 className="size-3.5"/> {board.columnsCount}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5" title="Cards">
                                                <WalletCards className="size-3.5"/> {board.cardsCount}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5" title="Labels">
                                                <Tag className="size-3.5"/> {board.labelsCount}
                                            </span>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>

                            <DropdownMenu
                                open={openDropdownId === board.id}
                                onOpenChange={(open) => setOpenDropdownId(open ? board.id : null)}
                            >
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="ghost"
                                            className="absolute top-3 right-3 bg-black/15 text-white/80 hover:bg-black/30 hover:text-white"
                                            aria-label={`Options for ${board.name}`}
                                        />
                                    }
                                >
                                    <Ellipsis/>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onClick={() => {
                                            handleOpenEditModal(board);
                                            setOpenDropdownId(null);
                                        }}>
                                            <Pencil/> Edit board
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            variant="destructive"
                                            disabled={deleteBoardMutation.isPending}
                                            onClick={() => setDeletingBoard({ id: board.id, name: board.name })}
                                        >
                                            <Trash2/> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </article>
                    )}

                    <CreateBoardDialog/>
                </section>
            </div>

            <Dialog open={isEditModalOpen} onOpenChange={(open) => {
                if (!open && updateBoardMutation.isPending) return;
                setIsEditModalOpen(open);
            }}>
                <DialogContent className="sm:max-w-md" showCloseButton={!updateBoardMutation.isPending}>
                    <form className="flex flex-col gap-5" onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdateBoard();
                    }}>
                        <DialogHeader>
                            <DialogTitle>Edit board</DialogTitle>
                            <DialogDescription>Update how this board is named and identified in your workspace.</DialogDescription>
                        </DialogHeader>

                        <div className="board-surface flex h-24 items-end rounded-xl p-4 text-white shadow-sm" style={{ backgroundColor: newColor }}>
                            <span className="truncate font-heading text-lg font-medium">{newName.trim() || "Untitled board"}</span>
                        </div>

                        <FieldGroup className="gap-4">
                            <Field data-disabled={updateBoardMutation.isPending || undefined}>
                                <FieldLabel htmlFor="edit-board-name">Board name</FieldLabel>
                                <Input
                                    required
                                    autoFocus
                                    id="edit-board-name"
                                    value={newName}
                                    maxLength={100}
                                    autoComplete="off"
                                    disabled={updateBoardMutation.isPending}
                                    onChange={(event) => setNewName(event.target.value)}
                                />
                            </Field>
                            <Field data-disabled={updateBoardMutation.isPending || undefined}>
                                <FieldLabel htmlFor="edit-board-color">Board color</FieldLabel>
                                <BoardColorPicker
                                    value={newColor}
                                    id="edit-board-color"
                                    onChange={setNewColor}
                                    disabled={updateBoardMutation.isPending}
                                />
                                <FieldDescription>{newColor.toUpperCase()} fills the board tile.</FieldDescription>
                            </Field>
                        </FieldGroup>

                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={updateBoardMutation.isPending} onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newName.trim() || updateBoardMutation.isPending}>
                                {updateBoardMutation.isPending && <Loader2 data-icon="inline-start" className="animate-spin"/>}
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {deletingBoard &&
                <DeleteConfirmationDialog
                    open={true}
                    isPending={deleteBoardMutation.isPending}
                    onOpenChange={(open) => !open && setDeletingBoard(null)}
                    onConfirm={() => onDeleteBoard(deletingBoard.id)}
                    title="Delete this board?"
                    description={`“${deletingBoard.name}” and all of its columns and cards will be permanently deleted.`}
                />
            }
        </main>
    );
}
