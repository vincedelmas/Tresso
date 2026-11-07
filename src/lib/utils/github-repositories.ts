import {FormattedError} from "~/lib/utils/error-classes";
import {createServerOnlyFn} from "@tanstack/react-start";


type GithubRepo = {
    id: number;
    fork: boolean;
    private: boolean;
    full_name: string;
    archived: boolean;
    language: string | null;
    description: string | null;
};


export const fetchGithubRepositories = createServerOnlyFn(async (token: string) => {
    const repos = [];

    for (let page = 1; ; page += 1) {
        let response: Response;

        try {
            response = await fetch(`https://api.github.com/user/repos?per_page=100&sort=full_name&direction=asc&page=${page}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-GitHub-Api-Version": "2026-03-10",
                    Accept: "application/vnd.github+json",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(30_000),
            });
        }
        catch {
            throw new FormattedError("Could not reach GitHub. Please try again.");
        }

        if (!response.ok) {
            throw new FormattedError(response.status === 401
                ? "GitHub rejected the token. Replace it with a valid personal access token."
                : response.status === 403 || response.status === 429
                    ? "GitHub denied access or its rate limit was reached. Check token access or try again later."
                    : "Could not retrieve repositories from GitHub. Please try again.");
        }

        const batch = await response.json() as GithubRepo[];

        repos.push(...batch.map(repo => ({
            fork: repo.fork,
            repositoryId: repo.id,
            private: repo.private,
            archived: repo.archived,
            language: repo.language,
            fullName: repo.full_name,
            description: repo.description,
        })));

        if (batch.length < 100) {
            return repos;
        }
    }
});
