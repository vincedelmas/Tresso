import type {z} from "zod";
import {db} from "~/lib/server/database/db";
import {and, asc, eq, max} from "drizzle-orm";
import {notFound} from "@tanstack/react-router";
import * as s from "~/lib/server/database/schemas";
import {createServerFn, createServerOnlyFn} from "@tanstack/react-start";
import {FormattedError} from "~/lib/utils/error-classes";
import {touchBoard} from "~/lib/utils/touch-board";
import {authMiddleware} from "~/lib/server/middlewares/authentication";
import {bulkUpdateCardsSchema, createCardSchema, deleteCardSchema, labelToCardSchema, moveCardSchema, updateCardContentSchema, updateCardTitleSchema} from "~/lib/types/schemas";


export const moveCardForUser = createServerOnlyFn((data: z.infer<typeof moveCardSchema>, userId: number) => {
    return db.transaction((tx) => {
        const sourceCard = tx
            .select({ id: s.cards.id, boardId: s.cards.boardId, columnId: s.cards.columnId })
            .from(s.cards)
            .innerJoin(s.boards, eq(s.cards.boardId, s.boards.id))
            .where(and(eq(s.cards.id, data.id), eq(s.boards.userId, userId)))
            .get();

        if (!sourceCard) {
            throw notFound();
        }

        const sourceColumn = tx
            .select({ id: s.columns.id })
            .from(s.columns)
            .where(and(eq(s.columns.id, sourceCard.columnId), eq(s.columns.boardId, sourceCard.boardId)))
            .get();

        const targetColumn = tx
            .select({ id: s.columns.id })
            .from(s.columns)
            .where(and(eq(s.columns.id, data.columnId), eq(s.columns.boardId, sourceCard.boardId)))
            .get();

        if (!sourceColumn || !targetColumn) {
            throw notFound();
        }

        const sourceCardIds = tx
            .select({ id: s.cards.id })
            .from(s.cards)
            .where(and(eq(s.cards.columnId, sourceCard.columnId), eq(s.cards.boardId, sourceCard.boardId)))
            .orderBy(asc(s.cards.order), asc(s.cards.id))
            .all()
            .map((card) => card.id);

        const destinationCardIds = sourceCard.columnId === data.columnId
            ? sourceCardIds
            : tx
                .select({ id: s.cards.id })
                .from(s.cards)
                .where(and(eq(s.cards.columnId, data.columnId), eq(s.cards.boardId, sourceCard.boardId)))
                .orderBy(asc(s.cards.order), asc(s.cards.id))
                .all()
                .map((card) => card.id);

        let reorderedDestinationIds = destinationCardIds.filter((id) => id !== sourceCard.id);

        if ((data.placement === "before" || data.placement === "after") && data.targetCardId === sourceCard.id) {
            reorderedDestinationIds = destinationCardIds;
        }
        else if (data.placement === "start") {
            reorderedDestinationIds.unshift(sourceCard.id);
        }
        else if (data.placement === "end") {
            reorderedDestinationIds.push(sourceCard.id);
        }
        else {
            const targetIndex = reorderedDestinationIds.indexOf(data.targetCardId);

            if (targetIndex === -1) {
                throw notFound();
            }

            reorderedDestinationIds.splice(targetIndex + (data.placement === "after" ? 1 : 0), 0, sourceCard.id);
        }

        const positions: { id: number; columnId: number; order: number }[] = [];

        if (sourceCard.columnId !== data.columnId) {
            const reorderedSourceIds = sourceCardIds.filter((id) => id !== sourceCard.id);

            for (const [order, id] of reorderedSourceIds.entries()) {
                tx.update(s.cards)
                    .set({ order })
                    .where(and(
                        eq(s.cards.id, id),
                        eq(s.cards.boardId, sourceCard.boardId),
                        eq(s.cards.columnId, sourceCard.columnId),
                    ))
                    .run();
                positions.push({ id, columnId: sourceCard.columnId, order });
            }
        }

        for (const [order, id] of reorderedDestinationIds.entries()) {
            tx.update(s.cards)
                .set({ columnId: data.columnId, order })
                .where(and(eq(s.cards.id, id), eq(s.cards.boardId, sourceCard.boardId)))
                .run();
            positions.push({ id, columnId: data.columnId, order });
        }

        tx.update(s.boards)
            .set({ updatedAt: new Date() })
            .where(eq(s.boards.id, sourceCard.boardId))
            .run();

        return positions;
    }, { behavior: "immediate" });
});


export const createCard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(createCardSchema)
    .handler(({ data, context: { currentUser } }) => {
        return db.transaction((tx) => {
            const targetColumn = tx
                .select({ id: s.columns.id })
                .from(s.columns)
                .innerJoin(s.boards, eq(s.columns.boardId, s.boards.id))
                .where(and(
                    eq(s.columns.id, data.columnId),
                    eq(s.columns.boardId, data.boardId),
                    eq(s.boards.userId, currentUser.id),
                ))
                .get();

            if (!targetColumn) {
                throw notFound();
            }

            const lastCard = tx
                .select({ value: max(s.cards.order) })
                .from(s.cards)
                .where(eq(s.cards.columnId, data.columnId))
                .get();

            const [newCard] = tx
                .insert(s.cards)
                .values({
                    title: data.title,
                    boardId: data.boardId,
                    columnId: data.columnId,
                    content: data.content || null,
                    order: (lastCard?.value ?? -1) + 1,
                })
                .returning()
                .all();

            tx.update(s.boards)
                .set({ updatedAt: new Date() })
                .where(eq(s.boards.id, data.boardId))
                .run();

            return { ...newCard, labels: [], repository: null };
        }, { behavior: "immediate" });
    });


export const moveCard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(moveCardSchema)
    .handler(({ data, context: { currentUser } }) => {
        return moveCardForUser(data, currentUser.id);
    });


export const deleteCard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(deleteCardSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const cardData = await db.query.cards.findFirst({
            where: eq(s.cards.id, data.id),
            with: {
                board: {
                    columns: { userId: true },
                },
            },
        });

        if (!cardData || cardData.board.userId !== currentUser.id) {
            throw notFound();
        }

        await db
            .delete(s.cards)
            .where(eq(s.cards.id, data.id));

        await touchBoard(cardData.boardId);
    });


export const updateCardTitle = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(updateCardTitleSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const cardData = await db.query.cards.findFirst({
            where: eq(s.cards.id, data.id),
            with: {
                board: {
                    columns: { userId: true },
                },
            },
        });

        if (!cardData || cardData.board.userId !== currentUser.id) {
            throw notFound();
        }

        await db
            .update(s.cards)
            .set({ title: data.title })
            .where(eq(s.cards.id, data.id));

        await touchBoard(cardData.boardId);

        return data;
    });


export const updateCardContent = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(updateCardContentSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const cardData = await db.query.cards.findFirst({
            where: eq(s.cards.id, data.id),
            with: {
                board: {
                    columns: { userId: true },
                },
            },
        });

        if (!cardData || cardData.board.userId !== currentUser.id) {
            throw notFound();
        }

        await db
            .update(s.cards)
            .set({ content: data.content })
            .where(eq(s.cards.id, data.id));

        await touchBoard(cardData.boardId);

        return data;
    });


export const addLabelToCard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(labelToCardSchema)
    .handler(async ({ data: { cardId, labelId }, context: { currentUser } }) => {
        const card = await db.query.cards.findFirst({
            where: eq(s.cards.id, cardId),
            with: {
                board: {
                    columns: { userId: true },
                },
            },
        });

        if (!card || card.board.userId !== currentUser.id) {
            throw notFound();
        }

        const labelToAdd = await db.query.labels.findFirst({ where: eq(s.labels.id, labelId) });
        if (!labelToAdd || labelToAdd.boardId !== card.boardId) {
            throw new FormattedError("Label do not exist or do not belong to this board.");
        }

        await db
            .insert(s.cardsToLabels)
            .values({ cardId: card.id, labelId: labelId })
            .onConflictDoNothing();

        await touchBoard(card.boardId);

        return labelToAdd;
    });


export const removeLabelFromCard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(labelToCardSchema)
    .handler(async ({ data: { cardId, labelId }, context: { currentUser } }) => {
        const card = await db.query.cards.findFirst({
            where: eq(s.cards.id, cardId),
            with: {
                board: {
                    columns: { userId: true },
                },
            },
        });

        if (!card || card.board.userId !== currentUser.id) {
            throw notFound();
        }

        const labelToRemove = await db.query.labels.findFirst({ where: eq(s.labels.id, labelId) });
        if (!labelToRemove || labelToRemove.boardId !== card.boardId) {
            throw new FormattedError("Label do not exist or do not belong to this board.");
        }

        await db
            .delete(s.cardsToLabels)
            .where(and(eq(s.cardsToLabels.cardId, cardId), eq(s.cardsToLabels.labelId, labelId)));

        await touchBoard(card.boardId);
    });



export const bulkUpdateCardsForUser = createServerOnlyFn((data: z.infer<typeof bulkUpdateCardsSchema>, userId: number) => {
    return db.transaction(tx => {
        const board = tx
            .select({ id: s.boards.id })
            .from(s.boards)
            .where(and(eq(s.boards.id, data.boardId), eq(s.boards.userId, userId)))
            .get();

        if (!board) {
            throw notFound();
        }

        const boardCards = tx
            .select({ id: s.cards.id, columnId: s.cards.columnId })
            .from(s.cards)
            .innerJoin(s.columns, eq(s.cards.columnId, s.columns.id))
            .where(eq(s.cards.boardId, data.boardId))
            .orderBy(asc(s.columns.order), asc(s.columns.id), asc(s.cards.order), asc(s.cards.id))
            .all();

        const selectedIds = new Set(data.cardIds);
        const selectedCards = boardCards.filter(card => selectedIds.has(card.id));

        if (selectedCards.length !== selectedIds.size) {
            throw notFound();
        }

        if (data.action !== "move") {
            const label = tx
                .select({ id: s.labels.id })
                .from(s.labels)
                .where(and(eq(s.labels.id, data.labelId), eq(s.labels.boardId, data.boardId)))
                .get();

            if (!label) {
                throw notFound();
            }

            for (const card of selectedCards) {
                if (data.action === "label") {
                    tx.insert(s.cardsToLabels)
                        .values({ cardId: card.id, labelId: label.id })
                        .onConflictDoNothing()
                        .run();
                }
                else {
                    tx.delete(s.cardsToLabels)
                        .where(and(eq(s.cardsToLabels.cardId, card.id), eq(s.cardsToLabels.labelId, label.id)))
                        .run();
                }
            }
        }
        else {
            const targetColumn = tx
                .select({ id: s.columns.id })
                .from(s.columns)
                .where(and(eq(s.columns.id, data.columnId), eq(s.columns.boardId, data.boardId)))
                .get();

            if (!targetColumn) {
                throw notFound();
            }

            const affectedColumns = new Set([...selectedCards.map(card => card.columnId), targetColumn.id]);

            for (const columnId of affectedColumns) {
                const reorderedCards = boardCards.filter(card => card.columnId === columnId && !selectedIds.has(card.id));

                if (columnId === targetColumn.id) {
                    reorderedCards.unshift(...selectedCards);
                }

                for (const [order, card] of reorderedCards.entries()) {
                    tx.update(s.cards)
                        .set({ columnId, order })
                        .where(eq(s.cards.id, card.id))
                        .run();
                }
            }
        }

        tx.update(s.boards)
            .set({ updatedAt: new Date() })
            .where(eq(s.boards.id, data.boardId))
            .run();
    }, { behavior: "immediate" });
});


export const bulkUpdateCards = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(bulkUpdateCardsSchema)
    .handler(({ data, context: { currentUser } }) => bulkUpdateCardsForUser(data, currentUser.id));
