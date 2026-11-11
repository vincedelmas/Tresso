import React, {useState} from "react";
import {Loader2, Plus} from "lucide-react";
import {toast} from "~/lib/client/components/ui/toast";
import {Input} from "~/lib/client/components/ui/input";
import {Button} from "~/lib/client/components/ui/button";
import {Checkbox} from "~/lib/client/components/ui/checkbox";
import {useCreateBoardMutation} from "~/lib/client/react-query/mutations";
import {BoardColorPicker, DEFAULT_BOARD_COLOR} from "~/lib/client/components/boards/BoardColorPicker";
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel} from "~/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "~/lib/client/components/ui/dialog";


export function CreateBoardDialog() {
    const [name, setName] = useState("");
    const createBoardMutation = useCreateBoardMutation();
    const [isOpen, setIsOpen] = useState(false);
    const [color, setColor] = useState(DEFAULT_BOARD_COLOR);
    const [prefillColumns, setPrefillColumns] = useState(false);

    const resetForm = () => {
        setName("");
        setPrefillColumns(false);
        setColor(DEFAULT_BOARD_COLOR);
    };

    const handleOpenChange = (open: boolean) => {
        if (!open && createBoardMutation.isPending) return;

        setIsOpen(open);
        if (!open) resetForm();
    };

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name.trim() || createBoardMutation.isPending) return;

        createBoardMutation.mutate({ data: { name, color, prefillColumns } }, {
            onSuccess: () => {
                setIsOpen(false);
                resetForm();
                toast.add({ title: "Board created successfully", type: "success" });
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-52 w-full flex-col gap-3 rounded-2xl bg-card/55 text-muted-foreground ring-1
                        ring-foreground/8 hover:bg-card hover:text-foreground"
                    />
                }
            >
                <span className="grid size-9 place-items-center rounded-lg bg-secondary ring-1 ring-foreground/8">
                    <Plus/>
                </span>
                <span className="text-sm font-medium">
                    Create board
                </span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" showCloseButton={!createBoardMutation.isPending}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>
                            Create board
                        </DialogTitle>
                        <DialogDescription>
                            Give your workspace a name and a color you can spot at a glance.
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        style={{ backgroundColor: color }}
                        className="board-surface flex h-24 items-end rounded-xl p-4 text-white shadow-sm"
                    >
                        <span className="truncate font-heading text-lg font-medium">
                            {name.trim() || "Untitled board"}
                        </span>
                    </div>

                    <FieldGroup className="gap-4">
                        <Field data-disabled={createBoardMutation.isPending || undefined}>
                            <FieldLabel htmlFor="board-name">
                                Board name
                            </FieldLabel>
                            <Input
                                required
                                autoFocus
                                value={name}
                                id="board-name"
                                maxLength={100}
                                autoComplete="off"
                                placeholder="Product roadmap"
                                disabled={createBoardMutation.isPending}
                                onChange={(event) => setName(event.target.value)}
                            />
                            <FieldDescription>
                                Keep it short enough to recognize at a glance.
                            </FieldDescription>
                        </Field>

                        <Field data-disabled={createBoardMutation.isPending || undefined}>
                            <FieldLabel htmlFor="board-color">
                                Board color
                            </FieldLabel>
                            <BoardColorPicker
                                value={color}
                                id="board-color"
                                onChange={setColor}
                                disabled={createBoardMutation.isPending}
                            />
                            <FieldDescription>
                                {color.toUpperCase()} fills the board tile.
                            </FieldDescription>
                        </Field>
                        <Field orientation="horizontal" data-disabled={createBoardMutation.isPending || undefined}>
                            <Checkbox
                                id="prefill-columns"
                                checked={prefillColumns}
                                onCheckedChange={setPrefillColumns}
                                disabled={createBoardMutation.isPending}
                            />
                            <FieldContent>
                                <FieldLabel htmlFor="prefill-columns">
                                    Pre-fill with starter columns
                                </FieldLabel>
                                <FieldDescription>
                                    Todo → On Hold → Up Next → In Progress → Done
                                </FieldDescription>
                            </FieldContent>
                        </Field>
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={createBoardMutation.isPending}
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name.trim() || createBoardMutation.isPending}>
                            {createBoardMutation.isPending &&
                                <Loader2
                                    data-icon="inline-start"
                                    className="animate-spin"
                                />
                            }
                            Create board
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
