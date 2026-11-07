import {createServerOnlyFn} from "@tanstack/react-start";
import {FormattedError} from "~/lib/utils/error-classes";

type GithubRepository = {
    id: number;
    full_name: string;
    description: string | null;
    private: boolean;
    archived: boolean;
    fork: boolean;
    language: string | null;
};

export const fetchGithubRepositories = createServerOnlyFn(async (token: string) => {
    const repositories = [];
    for (let page = 1; ; page++) {
        let response: Response;
        try {
            response = await fetch(`https://api.github.com/user/repos?per_page=100&sort=full_name&direction=asc&page=${page}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2026-03-10",
                },
                signal: AbortSignal.timeout(30_000),
                cache: "no-store",
            });
        } catch {
            throw new FormattedError("Could not reach GitHub. Please try again.");
        }
        if (!response.ok) {
            throw new FormattedError(response.status === 401
                ? "GitHub rejected the token. Replace it with a valid personal access token."
                : response.status === 403 || response.status === 429
                    ? "GitHub denied access or its rate limit was reached. Check token access or try again later."
                    : "Could not retrieve repositories from GitHub. Please try again.");
        }
        const batch = await response.json() as GithubRepository[];
        repositories.push(...batch.map(repo => ({
            repositoryId: repo.id,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            archived: repo.archived,
            fork: repo.fork,
            language: repo.language,
        })));
        if (batch.length < 100) return repositories;
    }
});
