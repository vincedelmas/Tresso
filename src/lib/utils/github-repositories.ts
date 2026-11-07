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


const mapGithubRepository = (repo: GithubRepo) => ({
    fork: repo.fork,
    repositoryId: repo.id,
    private: repo.private,
    archived: repo.archived,
    language: repo.language,
    fullName: repo.full_name,
    description: repo.description,
});


const fetchGithubResponse = createServerOnlyFn(async (token: string, path: string, allowNotFound = false) => {
    let response: Response;

    try {
        response = await fetch(`https://api.github.com${path}`, {
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

    if (response.ok || (allowNotFound && response.status === 404)) {
        return response;
    }

    if (response.status === 401) {
        throw new FormattedError("GitHub rejected the token. Replace it with a valid personal access token.");
    }

    if (response.status === 403 || response.status === 429) {
        throw new FormattedError("GitHub denied access or its rate limit was reached. Check token access or try again later.");
    }

    throw new FormattedError("Could not retrieve repositories from GitHub. Please try again.");
});


export const fetchGithubRepositories = createServerOnlyFn(async (token: string) => {
    const repos: ReturnType<typeof mapGithubRepository>[] = [];

    for (let page = 1; ; page += 1) {
        const response = await fetchGithubResponse(token, `/user/repos?per_page=100&sort=full_name&direction=asc&page=${page}`);
        const batch = await response.json() as GithubRepo[];

        repos.push(...batch.map(mapGithubRepository));

        if (batch.length < 100) {
            return repos;
        }
    }
});


export const fetchGithubRepository = createServerOnlyFn(async (token: string, repositoryId: number) => {
    const response = await fetchGithubResponse(token, `/repositories/${repositoryId}`, true);

    if (response.status === 404) {
        return null;
    }

    return mapGithubRepository(await response.json() as GithubRepo);
});
