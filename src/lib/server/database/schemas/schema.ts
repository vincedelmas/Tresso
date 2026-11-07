import {relations} from "drizzle-orm";
import {user} from "~/lib/server/database/schemas/auth.schema";
import {integer, primaryKey, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const usersRelations = relations(user, ({ many }) => ({
    boards: many(boards),
}));


export const boards = sqliteTable("boards", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    userId: integer("user_id").notNull().references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});


export const boardsRelations = relations(boards, ({ many, one }) => ({
    columns: many(columns),
    cards: many(cards),
    labels: many(labels),
    user: one(user, {
        fields: [boards.userId],
        references: [user.id],
    }),
}));


export const columns = sqliteTable("columns", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    archived: integer("archived", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
});


export const columnsRelations = relations(columns, ({ many, one }) => ({
    cards: many(cards),
    board: one(boards, {
        fields: [columns.boardId],
        references: [boards.id],
    }),
}));


export const cards = sqliteTable("cards", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    content: text("content"),
    order: integer("order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    columnId: integer("column_id").notNull().references(() => columns.id, { onDelete: "cascade" }),
});


export const cardsRelations = relations(cards, ({ many, one }) => ({
    board: one(boards, {
        fields: [cards.boardId],
        references: [boards.id],
    }),
    column: one(columns, {
        fields: [cards.columnId],
        references: [columns.id],
    }),
    labels: many(cardsToLabels),
    repository: one(githubRepositories),
}));


export const labels = sqliteTable("labels", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
});


export const labelsRelations = relations(labels, ({ one, many }) => ({
    board: one(boards, {
        fields: [labels.boardId],
        references: [boards.id],
    }),
    cards: many(cardsToLabels),
}));


export const cardsToLabels = sqliteTable("cards_to_labels", {
    cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    labelId: integer("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.cardId, table.labelId] })]);


export const cardsToLabelsRelations = relations(cardsToLabels, ({ one }) => ({
    card: one(cards, {
        fields: [cardsToLabels.cardId],
        references: [cards.id],
    }),
    label: one(labels, {
        fields: [cardsToLabels.labelId],
        references: [labels.id],
    }),
}));


export const githubConnections = sqliteTable("github_connections", {
    boardId: integer("board_id").primaryKey().references(() => boards.id, { onDelete: "cascade" }),
    encryptedToken: text("encrypted_token").notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp" }),
});

export const githubRepositories = sqliteTable("github_repositories", {
    cardId: integer("card_id").primaryKey().references(() => cards.id, { onDelete: "cascade" }),
    boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    repositoryId: integer("repository_id").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    private: integer("private", { mode: "boolean" }).notNull(),
    archived: integer("archived", { mode: "boolean" }).notNull(),
    fork: integer("fork", { mode: "boolean" }).notNull(),
    language: text("language"),
}, (table) => [uniqueIndex("github_repositories_board_repository").on(table.boardId, table.repositoryId)]);

export const githubRepositoriesRelations = relations(githubRepositories, ({ one }) => ({
    card: one(cards, { fields: [githubRepositories.cardId], references: [cards.id] }),
}));
