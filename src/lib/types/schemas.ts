import {z} from "zod";


export const positiveIdSchema = z.number().int().positive();

const orderSchema = z.number().int().nonnegative();
const nameSchema = z.string().trim().min(1).max(100);
const labelNameSchema = z.string().trim().min(1).max(25);
const cardTitleSchema = z.string().trim().min(1).max(200);
const cardDescriptionSchema = z.string().trim().max(10_000).optional();
const hexColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/);


// --- COLUMNS ---------------------------------------------------------------------

const columnSchema = z.object({
    id: positiveIdSchema,
    name: nameSchema,
    order: orderSchema,
    boardId: positiveIdSchema,
    archived: z.boolean(),
});

export const createColumnSchema = columnSchema.pick({ name: true, boardId: true });

export const updateColumnSchema = columnSchema.pick({ id: true, name: true, archived: true }).partial().required({ id: true });

export const moveColumnSchema = z.object({
    id: positiveIdSchema,
    targetColumnId: positiveIdSchema,
    placement: z.enum(["before", "after"]),
});

export const deleteColumnSchema = columnSchema.pick({ id: true });

// --- LABELS ---------------------------------------------------------------------

const labelSchema = z.object({
    id: positiveIdSchema,
    name: labelNameSchema,
    color: hexColorSchema,
    boardId: positiveIdSchema,
});

export const createLabelSchema = labelSchema.omit({ id: true });

export const updateLabelSchema = labelSchema.pick({ id: true, name: true, color: true }).partial().required({ id: true });

export const deleteLabelSchema = labelSchema.pick({ id: true, boardId: true });

export const labelToCardSchema = z.object({
    cardId: positiveIdSchema,
    labelId: positiveIdSchema,
});


// --- CARDS ---------------------------------------------------------------------

const cardSchema = z.object({
    id: positiveIdSchema,
    title: cardTitleSchema,
    order: orderSchema,
    boardId: positiveIdSchema,
    columnId: positiveIdSchema,
    content: cardDescriptionSchema,
});

export const createCardSchema = cardSchema.omit({ id: true, order: true });

const moveCardBaseSchema = cardSchema.pick({ id: true, columnId: true });

export const moveCardSchema = z.discriminatedUnion("placement", [
    moveCardBaseSchema.extend({ placement: z.literal("start") }),
    moveCardBaseSchema.extend({ placement: z.literal("end") }),
    moveCardBaseSchema.extend({ placement: z.literal("before"), targetCardId: positiveIdSchema }),
    moveCardBaseSchema.extend({ placement: z.literal("after"), targetCardId: positiveIdSchema }),
]);

const selectedCardsSchema = z.object({
    boardId: positiveIdSchema,
    cardIds: z.array(positiveIdSchema).min(1).max(10_000).transform(ids => [...new Set(ids)]),
});

export const bulkUpdateCardsSchema = z.discriminatedUnion("action", [
    selectedCardsSchema.extend({ action: z.literal("move"), columnId: positiveIdSchema }),
    selectedCardsSchema.extend({ action: z.literal("label"), labelId: positiveIdSchema }),
    selectedCardsSchema.extend({ action: z.literal("remove-label"), labelId: positiveIdSchema }),
]);

export const deleteCardSchema = cardSchema.pick({ id: true });

export const updateCardTitleSchema = cardSchema.pick({ id: true, title: true });

export const updateCardContentSchema = cardSchema.pick({ id: true, content: true }).required({ content: true });


// --- BOARDS ---------------------------------------------------------------------

const boardSchema = z.object({
    name: nameSchema,
    id: positiveIdSchema,
    color: hexColorSchema,
    cards: z.array(cardSchema),
    columns: z.array(columnSchema),
});

export const deleteBoardSchema = boardSchema.pick({ id: true });

export const getBoardSchema = z.object({ boardId: positiveIdSchema });

export const createBoardSchema = boardSchema.omit({ id: true, cards: true, columns: true });

export const updateBoardSchema = boardSchema.partial().omit({ cards: true, columns: true }).required({ id: true });


// --- GITHUB ---------------------------------------------------------------------

export const listGithubReposSchema = getBoardSchema.extend({
    token: z.string().trim().min(1).max(1000).optional(),
});

export const syncGithubReposSchema = getBoardSchema.extend({
    repositoryIds: z.array(positiveIdSchema).max(10_000),
});
