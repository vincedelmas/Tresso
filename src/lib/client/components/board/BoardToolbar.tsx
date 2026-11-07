import {useRef} from "react";
import {CheckSquare, ChevronDown, FolderInput, Tags, X} from "lucide-react";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "~/lib/client/components/ui/input-group";
import {DEFAULT_BOARD_FILTERS, type BoardFilters, type BoardType} from "~/lib/types/types";
import {Button} from "~/lib/client/components/ui/button";
import {Checkbox} from "~/lib/client/components/ui/checkbox";
import {Field, FieldLabel, FieldLegend, FieldSet} from "~/lib/client/components/ui/field";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "~/lib/client/components/ui/dropdown-menu";


interface BoardToolbarProps {
    board: BoardType;
    filters: BoardFilters;
    onFiltersChange: (filters: BoardFilters) => void;
    selectionMode: boolean;
    selectedIds: ReadonlySet<number>;
    visibleCardIds: number[];
    isPending: boolean;
    onSelectionModeChange: (enabled: boolean) => void;
    onSelectVisible: () => void;
    onAddLabel: (labelId: number) => void;
    onRemoveLabel: (labelId: number) => void;
    onMove: (columnId: number) => void;
}


export function BoardToolbar({
    board,
    filters,
    onFiltersChange,
    selectionMode,
    selectedIds,
    visibleCardIds,
    isPending,
    onSelectionModeChange,
    onSelectVisible,
    onAddLabel,
    onRemoveLabel,
    onMove,
}: BoardToolbarProps) {
    const searchRef = useRef<HTMLInputElement>(null);
    const selectedLabelIds = new Set(board.cards
        .filter(card => selectedIds.has(card.id))
        .flatMap(card => card.labels.map(label => label.id))
    );
    const labelActions = [
        {
            title: "Add label",
            labels: board.labels,
            onSelect: onAddLabel,
            emptyMessage: "Create a label from a card first",
        },
        {
            title: "Remove label",
            labels: board.labels.filter(label => selectedLabelIds.has(label.id)),
            onSelect: onRemoveLabel,
            emptyMessage: "Selected cards have no labels",
        },
    ];

    const visibleIds = new Set(visibleCardIds);
    const hiddenSelectionCount = [...selectedIds].filter(id => !visibleIds.has(id)).length;
    const allVisibleSelected = visibleCardIds.length > 0 && visibleCardIds.every(id => selectedIds.has(id));
    const hasFilters = Boolean(
        filters.search || filters.labelIds.length > 0 ||
        (board.github && (filters.publicOnly || filters.privateOnly || filters.archivedOnly))
    );

    const repositoryFilters = [
        { key: "publicOnly", label: "Public" },
        { key: "privateOnly", label: "Private" },
        { key: "archivedOnly", label: "Archived" },
    ] as const;

    return (
        <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
                <InputGroup className="w-full sm:w-72">
                    <InputGroupInput
                        ref={searchRef}
                        value={filters.search}
                        aria-label="Search cards"
                        placeholder="Search cards, notes, labels…"
                        onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
                    />
                    {filters.search && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label="Clear search"
                                onClick={() => {
                                    onFiltersChange({ ...filters, search: "" });
                                    searchRef.current?.focus();
                                }}
                            >
                                <X/>
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>

                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm"/>}>
                        <Tags data-icon="inline-start"/>
                        Labels{filters.labelIds.length > 0 && ` (${filters.labelIds.length})`}
                        <ChevronDown data-icon="inline-end"/>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-72 w-56 overflow-y-auto">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Match any selected label</DropdownMenuLabel>
                            {board.labels.map(label => (
                                <DropdownMenuCheckboxItem
                                    key={label.id}
                                    closeOnClick={false}
                                    checked={filters.labelIds.includes(label.id)}
                                    onCheckedChange={(checked) => onFiltersChange({
                                        ...filters,
                                        labelIds: checked
                                            ? [...filters.labelIds, label.id]
                                            : filters.labelIds.filter(id => id !== label.id),
                                    })}
                                >
                                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }}/>
                                    <span className="truncate">{label.name}</span>
                                </DropdownMenuCheckboxItem>
                            ))}
                            {board.labels.length === 0 && (
                                <DropdownMenuItem disabled>No labels yet</DropdownMenuItem>
                            )}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {board.github && (
                    <FieldSet className="flex-row flex-wrap items-center gap-3">
                        <FieldLegend className="sr-only">Repository filters</FieldLegend>
                        {repositoryFilters.map(({ key, label }) => (
                            <Field key={key} orientation="horizontal" className="w-auto">
                                <Checkbox
                                    id={key}
                                    checked={filters[key]}
                                    onCheckedChange={(checked) => onFiltersChange({ ...filters, [key]: checked })}
                                />
                                <FieldLabel htmlFor={key}>{label}</FieldLabel>
                            </Field>
                        ))}
                    </FieldSet>
                )}

                {hasFilters && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFiltersChange(DEFAULT_BOARD_FILTERS)}
                    >
                        <X data-icon="inline-start"/> Clear filters
                    </Button>
                )}

                <Button
                    size="sm"
                    variant={selectionMode ? "secondary" : "outline"}
                    disabled={isPending}
                    aria-pressed={selectionMode}
                    onClick={() => onSelectionModeChange(!selectionMode)}
                >
                    <CheckSquare data-icon="inline-start"/>
                    {selectionMode ? "Done selecting" : "Select cards"}
                </Button>
            </div>

            {selectionMode && (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground" role="status">
                        {isPending ? "Updating cards… " : ""}{selectedIds.size} selected
                        {hiddenSelectionCount > 0 && ` (${hiddenSelectionCount} hidden by filters)`}
                    </p>
                    <Button size="sm" variant="ghost" disabled={isPending || !visibleCardIds.length} onClick={onSelectVisible}>
                        {allVisibleSelected ? "Deselect visible" : "Select visible"}
                    </Button>

                    {labelActions.map(action => (
                        <DropdownMenu key={action.title}>
                            <DropdownMenuTrigger
                                render={<Button size="sm" variant="outline" disabled={isPending || !selectedIds.size}/>}
                            >
                                <Tags data-icon="inline-start"/>
                                {action.title}
                                <ChevronDown data-icon="inline-end"/>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-72 w-56 overflow-y-auto">
                                <DropdownMenuGroup>
                                    {action.labels.map(label => (
                                        <DropdownMenuItem key={label.id} onClick={() => action.onSelect(label.id)}>
                                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }}/>
                                            <span className="truncate">{label.name}</span>
                                        </DropdownMenuItem>
                                    ))}
                                    {action.labels.length === 0 && (
                                        <DropdownMenuItem disabled>{action.emptyMessage}</DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ))}

                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={<Button size="sm" variant="outline" disabled={isPending || !selectedIds.size}/>}
                        >
                            <FolderInput data-icon="inline-start"/>
                            Move to
                            <ChevronDown data-icon="inline-end"/>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-72 w-56 overflow-y-auto">
                            <DropdownMenuGroup>
                                {board.columns.map(column => (
                                    <DropdownMenuItem key={column.id} onClick={() => onMove(column.id)}>
                                        <span className="truncate">{column.name}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
}
