# Tresso

Tresso is a simple Kanban board application inspired by Trello made to be self-hosted.
It provides the core functionality needed to organize projects with boards, columns, cards and labels in a clean, modern interface.

## Features

- **Board Management:** Create multiple boards to separate your projects.
- **Draggable Interface:** Organize your workflow by dragging and dropping columns and cards.
- **Card Details:** Add titles and detailed descriptions to your cards.
- **Labeling System:** Create, edit, and assign color-coded labels to cards for easy categorization.
- **Authentication:** Secure user authentication via Google OAuth.
- **Clean UI:** A responsive and minimal user interface built with shadcn/ui + Tailwind CSS.

## Tech Stack

- **ORM:** Drizzle ORM
- **Language:** TypeScript
- **Routing:** TanStack Router
- **Authentication:** better-auth
- **Data Fetching & State:** TanStack Query
- **Framework:** TanStack Start (Full-stack React)
- **Database:** SQLite (libSQL client, but can be replaced by any other SQL database)
- **UI:**
    - React
    - shadcn/ui
    - Tailwind CSS

## Getting Started

Follow these instructions to get a local instance of Tresso up and running.

### Prerequisites

- BUn (v1.3+)
- Google OAuth credentials from Google Cloud Console.

#### 1. Clone the Repository

```bash
git clone https://github.com/Crossoufire/tresso.git
cd tresso
```

#### 2. Install Dependencies

```bash
bun install
```

#### 3. Set Up The Env Variables

Create a `.env` file in the root of the project by copying the example file:

```bash
cp .env.example .env
```

Now, fill in the `.env` file with your credentials:

```env
# Base URL of the app
VITE_BASE_URL="http://localhost:3000"

# SQLite Database URL
DATABASE_URL="/location/of/your/db"

# Better-Auth Secret
BETTER_AUTH_SECRET="your_strong_secret_here"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

For Google OAuth, ensure the "Authorized redirect URIs" in the Google Cloud Console is set to `${VITE_BASE_URL}/api/auth/callback/google`.

#### 4. Set Up the Database

This project uses Drizzle ORM to manage the database schema.
Run the following command to push the schema from `src/server/database/schemas` to your SQLite DB.

```bash
bun run dk push
```

#### 5. Run the App

You can now start the dev server with:

```bash
bun run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### GitHub repository boards

Open a board and choose **GitHub** to connect a fine-grained personal access token.
Give the token read-only **Metadata** access to the repositories you want to organize.
GitHub only returns repositories the token can access, including private repositories;
organization policies and token resource-owner selection may limit that list.

Load repositories, select them, and import them into **Inbox**. Move the linked cards
between columns and assign labels as usual. Repository descriptions and
Public/Private, Archived, Fork, and language badges are synced separately from your
card titles and personal notes. Use the board search and Private/Archived filters
to narrow the view.

**Refresh imported** updates metadata without moving cards or replacing titles,
notes, or labels. Repeated imports do not duplicate repositories on the same board.
New repositories must be selected for import. Repositories missing from the list are checked individually by their stable GitHub
ID. A 404 removes the linked card and its notes and labels. GitHub also returns
404 for repositories the token can no longer access, so those cards are removed
too. Network errors, rate limits, and server errors abort refresh without removing
cards. The refresh result reports how many cards were removed.
Deleting a card removes its link, so it can be imported again.

Apply the schema update with `bun run dk push` before using the feature.
Tokens are encrypted in the database with AES-256-GCM using a key derived from
`BETTER_AUTH_SECRET` and are never included in board responses. Keep that secret
stable; after changing it, replace saved GitHub tokens. **Remove saved token** stops
access to GitHub while keeping imported cards and metadata. Sync is manual and
does not change anything on GitHub.


### Board search, filters, and bulk actions

Every board includes search across card titles, notes, and labels, plus a label
filter. Selecting several labels shows cards matching any of them. Connected
GitHub boards also include Public, Private, and Archived filters; Public and
Private combine as alternatives, while Archived narrows either visibility.

Choose **Select cards** to select individual cards or **Select visible** to select
all cards matching the current filters. Use **Add label** to apply an existing
label to the selection, **Remove label** to remove a label from selected cards, or **Move to** to move selected cards to the top of a
column in their current board order. Existing labels and notes are preserved.

Selections persist when filters change. The toolbar reports selected cards hidden
by filters, and bulk actions include them. **Done selecting** clears the selection.
