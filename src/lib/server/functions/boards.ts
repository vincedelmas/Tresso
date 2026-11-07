import {db} from "~/lib/server/database/db";
import {notFound} from "@tanstack/react-router";
import * as s from "~/lib/server/database/schemas";
import {and, asc, desc, eq, sql} from "drizzle-orm";
import {createServerFn} from "@tanstack/react-start";
import {tryNotFound} from "~/lib/utils/try-not-found";
import {authMiddleware} from "~/lib/server/middlewares/authentication";
import {createBoardSchema, deleteBoardSchema, getBoardSchema, updateBoardSchema} from "~/lib/types/schemas";


export const getBoards = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        return db
            .select({
                id: s.boards.id,
                name: s.boards.name,
                color: s.boards.color,
                userId: s.boards.userId,
                createdAt: s.boards.createdAt,
                updatedAt: s.boards.updatedAt,
                cardsCount: sql<number>`(SELECT COUNT(*) FROM ${s.cards} WHERE ${s.cards.boardId} = boards.id)`,
                labelsCount: sql<number>`(SELECT COUNT(*) FROM ${s.labels} WHERE ${s.labels.boardId} = boards.id)`,
                columnsCount: sql<number>`(SELECT COUNT(*) FROM ${s.columns} WHERE ${s.columns.boardId} = boards.id)`,
            })
            .from(s.boards)
            .where(eq(s.boards.userId, currentUser.id))
            .orderBy(desc(s.boards.updatedAt));
    });


export const getBoard = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .validator((data) => tryNotFound(data, getBoardSchema))
    .handler(async ({ data: { boardId }, context: { currentUser } }) => {
        const boardData = await db.query.boards.findFirst({
            where: and(eq(s.boards.id, boardId), eq(s.boards.userId, currentUser.id)),
            with: {
                labels: { orderBy: asc(s.labels.name) },
                columns: { orderBy: asc(s.columns.order) },
                cards: {
                    orderBy: asc(s.cards.order),
                    with: { labels: { with: { label: true } }, repository: true },
                },
            },
        });

        if (!boardData) {
            throw notFound();
        }

        const connection = await db.query.githubConnections.findFirst({
            where: eq(s.githubConnections.boardId, boardId),
            columns: { syncedAt: true },
        });

        const board = {
            github: connection ? { connected: true, syncedAt: connection.syncedAt } : null,
            ...boardData,
            cards: boardData.cards.map(card => ({
                ...card,
                labels: card.labels.map((cardToLabel) => cardToLabel.label),
            })),
        };

        return board;
    });


export const createBoard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(createBoardSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const [newBoard] = await db
            .insert(s.boards)
            .values({
                ...data,
                userId: currentUser.id,
            }).returning({ id: s.boards.id });

        return newBoard.id;
    });


export const updateBoard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(updateBoardSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const { id, ...updates } = data;

        await db
            .update(s.boards)
            .set({ ...updates, updatedAt: new Date() })
            .where(and(eq(s.boards.id, id), eq(s.boards.userId, currentUser.id)));

        return data;
    });


export const deleteBoard = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(deleteBoardSchema)
    .handler(async ({ data: { id }, context: { currentUser } }) => {
        await db
            .delete(s.boards)
            .where(and(eq(s.boards.id, id), eq(s.boards.userId, currentUser.id)))
    });
