# Tresso

A self-hosted Kanban app inspired by Trello, with optional GitHub repository boards.

- Boards, draggable columns and cards, notes, and colored labels.
- Search and label filters on every board.
- Multi-select to move cards or add and remove labels.
- Import public and private GitHub repositories as cards, with manual refresh.
- Google sign-in.

Built with TanStack Start, React, TypeScript, Drizzle, SQLite, and shadcn/ui.

## Run locally

You'll need [Bun](https://bun.sh) and Google OAuth credentials.

```bash
git clone https://github.com/vincedelmas/Tresso.git
cd Tresso
bun install
cp .env.example .env
```

Edit `.env`:

```env
VITE_BASE_URL="http://localhost:3000"
DATABASE_URL="./site.db"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
in your Google OAuth settings. For another host, use its base URL instead.

```bash
bun run dk push
bun run dev
```

Open [localhost:3000](http://localhost:3000).

## GitHub boards

Open any board and click **GitHub**. Connect a fine-grained personal access token
with read-only **Metadata** access, select repositories, and import them into Inbox.
Use columns and labels to organize them, with Public, Private, Archived, and Fork
filters to narrow the board.

**Refresh imported** updates repository details while keeping your card titles,
notes, labels, and positions. Nothing is changed on GitHub.

Refresh removes a card if GitHub returns 404 for its repository. This also happens
if the token loses access to a private repository. The card's notes are deleted too.

Tokens are stored encrypted. Keep `BETTER_AUTH_SECRET` stable, or reconnect your
tokens after changing it.

## Development

```bash
bun test
bun run lint
```

## License

[GPL-3.0](LICENSE).
