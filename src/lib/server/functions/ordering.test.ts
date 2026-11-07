import {afterAll, beforeEach, describe, expect, test, spyOn} from "bun:test";
import Database from "bun:sqlite";
import {readFileSync, unlinkSync} from "node:fs";
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

sqlite.run(`
    CREATE TABLE labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE
    );
    CREATE TABLE cards_to_labels (
        card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY (card_id, label_id)
    );
`);

sqlite.run(readFileSync(new URL("../../../../drizzle/0002_smiling_mister_sinister.sql", import.meta.url), "utf8"));
const {syncGithubRepositoriesForUser} = await import("~/lib/server/functions/github");
const {encryptGithubToken, decryptGithubToken} = await import("~/lib/utils/github-token");

const {moveColumnForUser} = await import("~/lib/server/functions/columns");
const {bulkUpdateCardsForUser, moveCardForUser} = await import("~/lib/server/functions/cards");


beforeEach(() => {
    sqlite.run("DROP TRIGGER IF EXISTS fail_column_reorder");
    sqlite.run("DROP TRIGGER IF EXISTS fail_bulk_move");
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


describe("GitHub repository sync", () => {
    const repo = {
        id: 42,
        full_name: "owner/repository",
        description: "GitHub description",
        private: true,
        archived: false,
        fork: false,
        language: "TypeScript",
    };


    test("encrypts tokens with unique nonces and rejects tampering", () => {
        const encrypted = encryptGithubToken("private-token");

        expect(encrypted).not.toContain("private-token");
        expect(decryptGithubToken(encrypted)).toBe("private-token");
        expect(encryptGithubToken("private-token")).not.toBe(encrypted);

        const bytes = Buffer.from(encrypted, "base64");
        bytes[bytes.length - 1] ^= 1;
        expect(() => decryptGithubToken(bytes.toString("base64"))).toThrow();
    });

    test("imports once, refreshes metadata, and preserves organization and notes", async () => {
        sqlite.query("INSERT INTO github_connections (board_id, encrypted_token) VALUES (?, ?)").run(1, encryptGithubToken("token"));
        const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(Response.json([repo]));

        try {
            expect(await syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [42] }, 1))
                .toEqual({ imported: 1, refreshed: 0, removed: 0 });

            const linked = sqlite.query("SELECT card_id FROM github_repositories WHERE repository_id = 42").get() as { card_id: number };
            const inbox = sqlite.query("SELECT name FROM columns WHERE id = (SELECT column_id FROM cards WHERE id = ?)").get(linked.card_id);
            expect(inbox).toEqual({ name: "Inbox" });
            sqlite.query("UPDATE cards SET title = 'Custom title', content = 'My notes', column_id = 11, \"order\" = 99 WHERE id = ?").run(linked.card_id);

            fetchMock.mockResolvedValue(Response.json([{ ...repo, full_name: "owner/renamed", description: "New description", archived: true }]));
            expect(await syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [42] }, 1))
                .toEqual({ imported: 0, refreshed: 1, removed: 0 });
            expect(sqlite.query('SELECT title, content, column_id, "order" FROM cards WHERE id = ?').get(linked.card_id))
                .toEqual({ title: "Custom title", content: "My notes", column_id: 11, order: 99 });
            expect(sqlite.query("SELECT full_name, description, archived FROM github_repositories WHERE card_id = ?").get(linked.card_id))
                .toEqual({ full_name: "owner/renamed", description: "New description", archived: 1 });


            fetchMock
                .mockResolvedValueOnce(Response.json([]))
                .mockResolvedValueOnce(new Response("", { status: 404 }));
            expect(await syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [] }, 1))
                .toEqual({ imported: 0, refreshed: 0, removed: 1 });
            expect(sqlite.query("SELECT COUNT(*) AS count FROM github_repositories").get()).toEqual({ count: 0 });
            expect(sqlite.query("SELECT id FROM cards WHERE id = ?").get(linked.card_id)).toBeNull();
        }
        finally {
            fetchMock.mockRestore();
        }
    });

    test("keeps and refreshes a repository found by ID after it disappears from the list", async () => {
        sqlite.query("INSERT INTO github_connections (board_id, encrypted_token) VALUES (?, ?)").run(1, encryptGithubToken("token"));
        const fetchMock = spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json([repo]));

        try {
            await syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [42] }, 1);
            fetchMock
                .mockResolvedValueOnce(Response.json([]))
                .mockResolvedValueOnce(Response.json({ ...repo, full_name: "new-owner/renamed" }));

            expect(await syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [] }, 1))
                .toEqual({ imported: 0, refreshed: 1, removed: 0 });
            expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("https://api.github.com/repositories/42");
            expect(sqlite.query("SELECT full_name FROM github_repositories WHERE repository_id = 42").get())
                .toEqual({ full_name: "new-owner/renamed" });
        }
        finally {
            fetchMock.mockRestore();
        }
    });

    test("does not delete any cards if a missing-repository lookup fails", async () => {
        sqlite.query("INSERT INTO github_connections (board_id, encrypted_token) VALUES (?, ?)").run(1, encryptGithubToken("token"));
        const fetchMock = spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json([repo, { ...repo, id: 43 }]));

        try {
            await syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [42, 43] }, 1);

            for (const status of [403, 500]) {
                fetchMock
                    .mockResolvedValueOnce(Response.json([]))
                    .mockResolvedValueOnce(new Response("", { status: 404 }))
                    .mockResolvedValueOnce(new Response("", { status }));
                await expect(syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [] }, 1)).rejects.toThrow();
                expect(sqlite.query("SELECT COUNT(*) AS count FROM github_repositories").get()).toEqual({ count: 2 });
            }
        }
        finally {
            fetchMock.mockRestore();
        }
    });

    test("rejects access to another user's board before contacting GitHub", async () => {
        const fetchMock = spyOn(globalThis, "fetch");

        try {
            await expect(syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [] }, 2)).rejects.toMatchObject({ isNotFound: true });
            expect(fetchMock).not.toHaveBeenCalled();
        }
        finally {
            fetchMock.mockRestore();
        }
    });

    test("does not write cards after a partial pagination failure", async () => {
        sqlite.query("INSERT INTO github_connections (board_id, encrypted_token) VALUES (?, ?)").run(1, encryptGithubToken("token"));
        const fetchMock = spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(Response.json(Array.from({ length: 100 }, (_, id) => ({ ...repo, id: id + 1 }))))
            .mockResolvedValueOnce(new Response("", { status: 403 }));

        try {
            await expect(syncGithubRepositoriesForUser({ boardId: 1, repositoryIds: [42] }, 1)).rejects.toThrow("GitHub denied access");
            expect(sqlite.query("SELECT COUNT(*) AS count FROM github_repositories").get()).toEqual({ count: 0 });
            expect(sqlite.query("SELECT synced_at FROM github_connections WHERE board_id = 1").get()).toEqual({ synced_at: null });
        }
        finally {
            fetchMock.mockRestore();
        }
    });
});



describe("bulk card actions", () => {
    test("moves a selection to the top in board order and normalizes affected columns", () => {
        bulkUpdateCardsForUser({
            action: "move",
            boardId: 1,
            cardIds: [201, 102, 100],
            columnId: 11,
        }, 1);

        expect(sqlite.query('SELECT id, column_id, "order" FROM cards WHERE board_id = 1 ORDER BY column_id, "order"').all())
            .toEqual([
                { id: 101, column_id: 10, order: 0 },
                { id: 100, column_id: 11, order: 0 },
                { id: 102, column_id: 11, order: 1 },
                { id: 201, column_id: 11, order: 2 },
                { id: 200, column_id: 11, order: 3 },
            ]);
        expect(sqlite.query('SELECT column_id, "order" FROM cards WHERE id = 300').get())
            .toEqual({ column_id: 20, order: 10 });
    });

    test("rejects foreign cards, columns, and users without moving any cards", () => {
        const before = sqlite.query("SELECT * FROM cards ORDER BY id").all();

        for (const data of [
            { action: "move" as const, boardId: 1, cardIds: [100, 300], columnId: 11 },
            { action: "move" as const, boardId: 1, cardIds: [100, 101], columnId: 20 },
        ]) {
            expect(() => bulkUpdateCardsForUser(data, 1)).toThrow();
        }

        expect(() => bulkUpdateCardsForUser({ action: "move", boardId: 1, cardIds: [100], columnId: 11 }, 2)).toThrow();
        expect(sqlite.query("SELECT * FROM cards ORDER BY id").all()).toEqual(before);
    });

    test("adds a label to all selected cards without duplicating existing labels", () => {
        sqlite.run("INSERT INTO labels (id, name, color, created_at, board_id) VALUES (1, 'Maintained', '#aabbcc', 1, 1)");
        sqlite.run("INSERT INTO cards_to_labels (card_id, label_id) VALUES (100, 1)");

        bulkUpdateCardsForUser({ action: "label", boardId: 1, cardIds: [100, 101, 200], labelId: 1 }, 1);
        bulkUpdateCardsForUser({ action: "label", boardId: 1, cardIds: [100, 101, 200], labelId: 1 }, 1);

        expect(sqlite.query("SELECT card_id, label_id FROM cards_to_labels ORDER BY card_id").all()).toEqual([
            { card_id: 100, label_id: 1 },
            { card_id: 101, label_id: 1 },
            { card_id: 200, label_id: 1 },
        ]);
    });

    test("removes only the requested label from selected cards and tolerates missing labels", () => {
        sqlite.run("INSERT INTO labels (id, name, color, created_at, board_id) VALUES (1, 'Maintained', '#aabbcc', 1, 1), (2, 'Work', '#aabbcc', 1, 1)");
        sqlite.run("INSERT INTO cards_to_labels (card_id, label_id) VALUES (100, 1), (100, 2), (101, 1), (200, 1)");

        bulkUpdateCardsForUser({ action: "remove-label", boardId: 1, cardIds: [100, 101, 102], labelId: 1 }, 1);
        bulkUpdateCardsForUser({ action: "remove-label", boardId: 1, cardIds: [100, 101, 102], labelId: 1 }, 1);

        expect(sqlite.query("SELECT card_id, label_id FROM cards_to_labels ORDER BY card_id, label_id").all()).toEqual([
            { card_id: 100, label_id: 2 },
            { card_id: 200, label_id: 1 },
        ]);
    });

    test("rejects foreign cards, labels, and users before removing labels", () => {
        sqlite.run("INSERT INTO labels (id, name, color, created_at, board_id) VALUES (1, 'Own', '#aabbcc', 1, 1), (2, 'Foreign', '#aabbcc', 1, 2)");
        sqlite.run("INSERT INTO cards_to_labels (card_id, label_id) VALUES (100, 1), (300, 2)");
        const before = sqlite.query("SELECT * FROM cards_to_labels ORDER BY card_id").all();

        expect(() => bulkUpdateCardsForUser({ action: "remove-label", boardId: 1, cardIds: [100, 300], labelId: 1 }, 1)).toThrow();
        expect(() => bulkUpdateCardsForUser({ action: "remove-label", boardId: 1, cardIds: [100], labelId: 2 }, 1)).toThrow();
        expect(() => bulkUpdateCardsForUser({ action: "remove-label", boardId: 1, cardIds: [100], labelId: 1 }, 2)).toThrow();
        expect(sqlite.query("SELECT * FROM cards_to_labels ORDER BY card_id").all()).toEqual(before);
    });

    test("rejects foreign labels or cards without partially applying a label", () => {
        sqlite.run("INSERT INTO labels (id, name, color, created_at, board_id) VALUES (1, 'Own', '#aabbcc', 1, 1), (2, 'Foreign', '#aabbcc', 1, 2)");

        expect(() => bulkUpdateCardsForUser({ action: "label", boardId: 1, cardIds: [100, 101], labelId: 2 }, 1)).toThrow();
        expect(() => bulkUpdateCardsForUser({ action: "label", boardId: 1, cardIds: [100, 300], labelId: 1 }, 1)).toThrow();
        expect(sqlite.query("SELECT * FROM cards_to_labels").all()).toEqual([]);
    });

    test("rolls back every card when a bulk move fails midway", () => {
        const before = sqlite.query("SELECT * FROM cards ORDER BY id").all();
        sqlite.run(`
            CREATE TRIGGER fail_bulk_move BEFORE UPDATE ON cards
            WHEN NEW.id = 102
            BEGIN SELECT RAISE(FAIL, 'injected failure'); END;
        `);

        expect(() => bulkUpdateCardsForUser({ action: "move", boardId: 1, cardIds: [100, 102], columnId: 11 }, 1)).toThrow();
        expect(sqlite.query("SELECT * FROM cards ORDER BY id").all()).toEqual(before);
    });
});
