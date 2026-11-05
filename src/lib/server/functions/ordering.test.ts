import {afterAll, beforeEach, describe, expect, test} from "bun:test";
import Database from "bun:sqlite";
import {unlinkSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";


const databasePath = join(tmpdir(), `tresso-ordering-${process.pid}-${Date.now()}.sqlite`);

process.env.DATABASE_URL = databasePath;
process.env.BETTER_AUTH_SECRET ??= "test-secret-with-at-least-twenty-characters";
process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";

const sqlite = new Database(databasePath, { create: true });

sqlite.run("PRAGMA foreign_keys = ON");
sqlite.run(`
    CREATE TABLE user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        email_verified INTEGER NOT NULL
    );
    CREATE TABLE boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES user(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );
    CREATE TABLE columns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE
    );
    CREATE TABLE cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        "order" INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE
    );
`);

const {moveColumnForUser} = await import("~/lib/server/functions/columns");
const {moveCardForUser} = await import("~/lib/server/functions/cards");


beforeEach(() => {
    sqlite.run("DROP TRIGGER IF EXISTS fail_column_reorder");
    sqlite.run("DELETE FROM cards; DELETE FROM columns; DELETE FROM boards; DELETE FROM user;");

    const now = Math.floor(Date.now() / 1000);
    sqlite.query("INSERT INTO user (id, name, email, created_at, updated_at, email_verified) VALUES (?, ?, ?, ?, ?, ?)")
        .run(1, "Owner", "owner@example.com", now, now, 1);
    sqlite.query("INSERT INTO user (id, name, email, created_at, updated_at, email_verified) VALUES (?, ?, ?, ?, ?, ?)")
        .run(2, "Other", "other@example.com", now, now, 1);
    sqlite.query("INSERT INTO boards (id, name, color, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(1, "Board", "blue", 1, now, now);
    sqlite.query("INSERT INTO boards (id, name, color, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(2, "Other board", "red", 2, now, now);

    const insertColumn = sqlite.query("INSERT INTO columns (id, name, \"order\", archived, created_at, board_id) VALUES (?, ?, ?, 0, ?, ?)");
    insertColumn.run(10, "First", 10, now, 1);
    insertColumn.run(11, "Second", 20, now, 1);
    insertColumn.run(12, "Third", 30, now, 1);
    insertColumn.run(20, "Other", 10, now, 2);

    const insertCard = sqlite.query("INSERT INTO cards (id, title, \"order\", created_at, board_id, column_id) VALUES (?, ?, ?, ?, ?, ?)");
    insertCard.run(100, "One", 10, now, 1, 10);
    insertCard.run(101, "Two", 20, now, 1, 10);
    insertCard.run(102, "Three", 30, now, 1, 10);
    insertCard.run(200, "Four", 10, now, 1, 11);
    insertCard.run(201, "Five", 20, now, 1, 11);
    insertCard.run(300, "Other", 10, now, 2, 20);
});


afterAll(() => {
    sqlite.close();
    unlinkSync(databasePath);
});


describe("transactional ordering", () => {
    test("moves a column by intent and normalizes its board's positions", () => {
        const positions = moveColumnForUser({ id: 12, targetColumnId: 10, placement: "before" }, 1);

        expect(positions).toEqual([
            { id: 12, order: 0 },
            { id: 10, order: 1 },
            { id: 11, order: 2 },
        ]);
        expect(sqlite.query("SELECT id, \"order\" FROM columns WHERE board_id = 1 ORDER BY \"order\", id").all()).toEqual(positions);
    });

    test("moves a card across columns and reindexes both columns", () => {
        const positions = moveCardForUser({
            id: 101,
            columnId: 11,
            targetCardId: 201,
            placement: "after",
        }, 1);

        expect(positions).toEqual([
            { id: 100, columnId: 10, order: 0 },
            { id: 102, columnId: 10, order: 1 },
            { id: 200, columnId: 11, order: 0 },
            { id: 201, columnId: 11, order: 1 },
            { id: 101, columnId: 11, order: 2 },
        ]);
        expect(sqlite.query("SELECT id, column_id AS columnId, \"order\" FROM cards WHERE board_id = 1 ORDER BY column_id, \"order\", id").all()).toEqual(positions);
    });

    test("rejects targets on another board without changing any order", () => {
        expect(() => moveColumnForUser({ id: 10, targetColumnId: 20, placement: "after" }, 1)).toThrow();
        expect(() => moveCardForUser({ id: 100, columnId: 20, placement: "start" }, 1)).toThrow();

        expect(sqlite.query("SELECT id, \"order\" FROM columns ORDER BY id").all()).toEqual([
            { id: 10, order: 10 },
            { id: 11, order: 20 },
            { id: 12, order: 30 },
            { id: 20, order: 10 },
        ]);
        expect(sqlite.query("SELECT id, column_id AS columnId, \"order\" FROM cards ORDER BY id").all()).toEqual([
            { id: 100, columnId: 10, order: 10 },
            { id: 101, columnId: 10, order: 20 },
            { id: 102, columnId: 10, order: 30 },
            { id: 200, columnId: 11, order: 10 },
            { id: 201, columnId: 11, order: 20 },
            { id: 300, columnId: 20, order: 10 },
        ]);
    });

    test("rolls back every position when a reorder update fails", () => {
        sqlite.run(`
            CREATE TRIGGER fail_column_reorder
            BEFORE UPDATE OF "order" ON columns
            WHEN OLD.id = 10 AND NEW."order" <> OLD."order"
            BEGIN
                SELECT RAISE(ABORT, 'forced reorder failure');
            END;
        `);

        expect(() => moveColumnForUser({ id: 12, targetColumnId: 10, placement: "before" }, 1)).toThrow();
        expect(sqlite.query("SELECT id, \"order\" FROM columns WHERE board_id = 1 ORDER BY id").all()).toEqual([
            { id: 10, order: 10 },
            { id: 11, order: 20 },
            { id: 12, order: 30 },
        ]);
    });
});
