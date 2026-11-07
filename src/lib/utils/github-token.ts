import {createCipheriv, createDecipheriv, createHash, randomBytes} from "node:crypto";
import {createServerOnlyFn} from "@tanstack/react-start";
import {serverEnv} from "~/env/server";

// Domain separation keeps the encryption key specific to this integration.
const tokenKey = createServerOnlyFn(() =>
    createHash("sha256").update("tresso:github-token:").update(serverEnv.BETTER_AUTH_SECRET).digest()
);

export const encryptGithubToken = createServerOnlyFn((token: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
});

export const decryptGithubToken = createServerOnlyFn((encrypted: string) => {
    const bytes = Buffer.from(encrypted, "base64");
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
});
