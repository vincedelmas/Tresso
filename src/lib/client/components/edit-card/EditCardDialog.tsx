import {RepoDetails} from "~/lib/client/components/board/RepoDetails";
import {CardType} from "~/lib/types/types";
import {LoaderCircle, X} from "lucide-react";
import React, {useRef, useState} from "react";
import {Label} from "~/lib/client/components/ui/label";
import {Badge} from "~/lib/client/components/ui/badge";
import {Button} from "~/lib/client/components/ui/button";
import {Textarea} from "~/lib/client/components/ui/textarea";
import {EditableText} from "~/lib/client/components/board/EditableText";
import {useOnClickOutside} from "~/lib/client/hooks/use-clicked-outside";
import {LabelManagerPopover} from "~/lib/client/components/edit-card/LabelManagerPopover";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "~/lib/client/components/ui/dialog";
import {useRemoveLabelFromCardMutation, useUpdateCardContentMutation, useUpdateCardTitleMutation} from "~/lib/client/react-query/mutations";


interface EditCardDialogProps {
    card: CardType;
    isDialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
}


export function EditCardDialog({ card, isDialogOpen, setDialogOpen }: EditCardDialogProps) {
    const dialogRef = useRef(null);
    const titleEditState = useState(false);
    const [newContent, setNewContent] = useState(card.content || "");
    const updateCardTitleMutation = useUpdateCardTitleMutation(card.boardId);
    const [isEditingContent, setIsEditingContent] = useState(false);
    const updateCardContentMutation = useUpdateCardContentMutation(card.boardId);
    const removeLabelFromCardMutation = useRemoveLabelFromCardMutation(card.boardId);

    const cancelContentEdit = () => {
        setNewContent(card.content || "");
        setIsEditingContent(false);
    };

    const updateCardTitleHandler = (newTitle: string) => {
        updateCardTitleMutation.mutate({ data: { id: card.id, title: newTitle } });
    }

    const updateCardContentHandler = (newContent: string) => {
        if (newContent === card.content) {
            setIsEditingContent(false);
            return;
        }
        updateCardContentMutation.mutate({ data: { id: card.id, content: newContent } }, {
            onSuccess: () => setIsEditingContent(false),
        });
    }

    const removeSelectedLabel = (labelId: number) => {
        removeLabelFromCardMutation.mutate({ data: { cardId: card.id, labelId } });
    };

    useOnClickOutside(dialogRef, cancelContentEdit);

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) cancelContentEdit();
            setDialogOpen(open);
        }}>
            <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-xl" ref={dialogRef}>
                <DialogHeader>
                    <DialogTitle>Edit card</DialogTitle>
                    <DialogDescription>
                        Refine the title, description, and labels for this card.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-1">
                    {card.repository && <RepoDetails repository={card.repository} showLink/>}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Title</Label>
                        <EditableText
                            multiline={true}
                            fieldName="title"
                            editState={titleEditState}
                            onChange={(value) => updateCardTitleHandler(value)}
                            inputClass="min-h-24 w-full resize-y bg-input/30 px-3 py-2 text-base"
                            buttonClass="h-auto min-h-10 w-full justify-start bg-input/20 px-3 py-2 text-left text-base leading-6 whitespace-pre-wrap ring-1 ring-foreground/8 hover:bg-input/35"
                            value={(updateCardTitleMutation.isPending && updateCardTitleMutation.variables.data.title) ?
                                updateCardTitleMutation.variables.data.title : card.title
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="content">{card.repository ? "Personal notes" : "Description"}</Label>
                        {isEditingContent ?
                            <div className="flex flex-col gap-2">
                                <Textarea
                                    id="content"
                                    value={newContent}
                                    maxLength={10000}
                                    className="min-h-44 resize-y bg-input/30"
                                    placeholder="e.g. Add a short brief, acceptance criteria, useful links, or next steps…"
                                    onChange={(ev) => setNewContent(ev.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelContentEdit}
                                        disabled={updateCardContentMutation.isPending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={updateCardContentMutation.isPending}
                                        onClick={() => updateCardContentHandler(newContent)}
                                    >
                                        {updateCardContentMutation.isPending &&
                                            <LoaderCircle data-icon="inline-start" className="animate-spin"/>
                                        } Save
                                    </Button>
                                </div>
                            </div>
                            :
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-auto min-h-28 w-full items-start justify-start bg-input/20 px-3 py-2 text-left leading-6 whitespace-pre-wrap text-muted-foreground ring-1 ring-foreground/8 hover:bg-input/35 hover:text-foreground"
                                onClick={() => {
                                    setNewContent(card.content || "");
                                    setIsEditingContent(true);
                                }}
                            >
                                {card.content || "Add a description… Try a short brief, acceptance criteria, links, or next steps."}
                            </Button>
                        }
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Labels</Label>
                        <div className="flex min-h-12 items-center gap-2 rounded-lg bg-input/20 p-2.5 ring-1 ring-foreground/8">
                            <div className="flex flex-1 flex-wrap gap-1.5">
                                {card.labels.length === 0 ?
                                    <span className="text-sm text-muted-foreground">
                                        No labels assigned.
                                    </span>
                                    :
                                    card.labels.map((label) =>
                                        <Badge
                                            key={label.id}
                                            className="gap-1 border-0 text-black/80"
                                            style={{ backgroundColor: label.color }}
                                        >
                                            {label.name}
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                aria-label={`Remove ${label.name}`}
                                                className="-mr-1 size-4 text-black/60 hover:bg-black/15 hover:text-black"
                                                onClick={() => removeSelectedLabel(label.id)}
                                            >
                                                <X/>
                                            </Button>
                                        </Badge>
                                    )
                                }
                            </div>
                            <LabelManagerPopover card={card}/>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
