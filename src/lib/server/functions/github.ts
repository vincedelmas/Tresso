import {z} from "zod";
import {and, eq, max} from "drizzle-orm";
import {notFound} from "@tanstack/react-router";
import {createServerFn, createServerOnlyFn} from "@tanstack/react-start";
import {db} from "~/lib/server/database/db";
import * as s from "~/lib/server/database/schemas";
import {authMiddleware} from "~/lib/server/middlewares/authentication";
import {getBoardSchema, positiveIdSchema} from "~/lib/types/schemas";
import {FormattedError} from "~/lib/utils/error-classes";
import {decryptGithubToken, encryptGithubToken} from "~/lib/utils/github-token";
import {fetchGithubRepositories} from "~/lib/utils/github-repositories";

const getConnectionForUser = createServerOnlyFn(async (boardId: number, userId: number) => {
    const board = await db.query.boards.findFirst({
        where: and(eq(s.boards.id, boardId), eq(s.boards.userId, userId)),
        columns: { id: true },
    });
    if (!board) throw notFound();
    return db.query.githubConnections.findFirst({ where: eq(s.githubConnections.boardId, boardId) });
});

export const listGithubRepositories = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(getBoardSchema.extend({ token: z.string().trim().min(1).max(1000).optional() }))
    .handler(async ({ data, context: { currentUser } }) => {
        const connection = await getConnectionForUser(data.boardId, currentUser.id);
        if (!data.token && !connection) throw new FormattedError("Connect a GitHub token first.");
        const token = data.token ?? decryptGithubToken(connection!.encryptedToken);
        const repositories = await fetchGithubRepositories(token);
        if (data.token) {
            const encryptedToken = encryptGithubToken(token);
            await db.insert(s.githubConnections)
                .values({ boardId: data.boardId, encryptedToken })
                .onConflictDoUpdate({
                    target: s.githubConnections.boardId,
                    set: { encryptedToken },
                });
        }
        return repositories;
    });

const syncSchema = getBoardSchema.extend({ repositoryIds: z.array(positiveIdSchema).max(10_000) });

export const syncGithubRepositoriesForUser = createServerOnlyFn(async (data: z.infer<typeof syncSchema>, userId: number) => {
    const connection = await getConnectionForUser(data.boardId, userId);
    if (!connection) throw new FormattedError("Connect a GitHub token first.");
    const repositories = await fetchGithubRepositories(decryptGithubToken(connection.encryptedToken));
    const selected = new Set(data.repositoryIds);
    if (data.repositoryIds.some(id => !repositories.some(repo => repo.repositoryId === id))) {
        throw new FormattedError("Some selected repositories are no longer accessible. Reload the repository list.");
    }

    return db.transaction(tx => {
        // Recheck ownership and connection after the network request.
        const board = tx.select().from(s.boards)
            .where(and(eq(s.boards.id, data.boardId), eq(s.boards.userId, userId))).get();
        const currentConnection = tx.select().from(s.githubConnections)
            .where(eq(s.githubConnections.boardId, data.boardId)).get();
        if (!board) throw notFound();
        if (!currentConnection || currentConnection.encryptedToken !== connection.encryptedToken) {
            throw new FormattedError("The GitHub connection changed. Please try again.");
        }
        const existing = tx.select().from(s.githubRepositories)
            .where(eq(s.githubRepositories.boardId, data.boardId)).all();
        let inbox = tx.select().from(s.columns).where(and(
            eq(s.columns.boardId, data.boardId), eq(s.columns.name, "Inbox"), eq(s.columns.archived, false),
        )).get();
        let imported = 0;
        let refreshed = 0;
        let order = inbox
            ? (tx.select({ value: max(s.cards.order) }).from(s.cards).where(eq(s.cards.columnId, inbox.id)).get()?.value ?? -1) + 1
            : 0;

        for (const repo of repositories) {
            const linked = existing.find(item => item.repositoryId === repo.repositoryId);
            if (linked) {
                tx.update(s.githubRepositories).set(repo).where(eq(s.githubRepositories.cardId, linked.cardId)).run();
                refreshed++;
            } else if (selected.has(repo.repositoryId)) {
                if (!inbox) {
                    const last = tx.select({ value: max(s.columns.order) }).from(s.columns)
                        .where(eq(s.columns.boardId, data.boardId)).get();
                    inbox = tx.insert(s.columns).values({
                        boardId: data.boardId, name: "Inbox", order: (last?.value ?? -1) + 1,
                    }).returning().get();
                }
                const card = tx.insert(s.cards).values({
                    boardId: data.boardId, columnId: inbox.id, title: repo.fullName, order: order++,
                }).returning().get();
                tx.insert(s.githubRepositories).values({ ...repo, cardId: card.id, boardId: data.boardId }).run();
                imported++;
            }
        }
        const now = new Date();
        tx.update(s.githubConnections).set({ syncedAt: now }).where(eq(s.githubConnections.boardId, data.boardId)).run();
        tx.update(s.boards).set({ updatedAt: now }).where(eq(s.boards.id, data.boardId)).run();
        return { imported, refreshed, unavailable: existing.length - refreshed };
    }, { behavior: "immediate" });
});

export const syncGithubRepositories = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(syncSchema)
    .handler(({ data, context: { currentUser } }) => syncGithubRepositoriesForUser(data, currentUser.id));


export const disconnectGithub = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator(getBoardSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        await getConnectionForUser(data.boardId, currentUser.id);
        await db.delete(s.githubConnections).where(eq(s.githubConnections.boardId, data.boardId));
    });
