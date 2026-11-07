import type {boardDetailsOptions} from "~/lib/client/react-query/query-options";


export const CONTENT_TYPES = {
    card: "board-card",
    column: "board-column",
};


export type ColTransferType = {
    id: number;
    name: string;
} | null;


export type CardTransferType = {
    id: number;
    title: string;
} | null;


export type CardType = BoardType["cards"][number];
export type CardLabel = CardType["labels"][number];
export type ColumnWithCards = BoardType["columns"][number] & { cards: BoardType["cards"] };
export type BoardType = Awaited<ReturnType<NonNullable<ReturnType<typeof boardDetailsOptions>["queryFn"]>>>;


export interface CardSelection {
    selectedIds: ReadonlySet<number>;
    isPending: boolean;
    onToggle: (cardId: number) => void;
}



export interface BoardFilters {
    search: string;
    labelIds: number[];
    publicOnly: boolean;
    privateOnly: boolean;
    archivedOnly: boolean;
    forkOnly: boolean;
}


export const DEFAULT_BOARD_FILTERS: BoardFilters = {
    search: "",
    labelIds: [],
    publicOnly: false,
    privateOnly: false,
    archivedOnly: false,
    forkOnly: false,
};
