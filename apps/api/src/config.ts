import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConnectOptions } from "mongoose";

const apiDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(apiDir, "../../..");
const apiRoot = resolve(apiDir, "..");

export const defaultEnvFiles = [
  resolve(workspaceRoot, ".env"),
  resolve(apiRoot, ".env")
];

export function loadEnvFiles(paths = defaultEnvFiles) {
  const shellKeys = new Set(Object.keys(process.env));

  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const values = parseEnvFile(readFileSync(path, "utf8"));

    for (const [key, value] of Object.entries(values)) {
      if (!shellKeys.has(key)) {
        process.env[key] = value;
      }
    }
  }
}

export function getApiPort(): number {
  return Number(process.env.PORT ?? 3000);
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "expomanage-local-dev-secret";
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? (process.env.NODE_ENV === "test" ? "admin@expomanage.local" : "");
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "test" ? "admin123" : "");
}

export function getAdminName(): string {
  return process.env.ADMIN_NAME ?? "Administrador";
}

export function getCnpjApiUrl(): string {
  return process.env.CNPJ_API_URL ?? "";
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? "";
}

export function getMongoConnectionOptions(): ConnectOptions {
  return {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 10000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS ?? 10000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS ?? 45000),
    family: Number(process.env.MONGO_IP_FAMILY ?? 4)
  };
}

export function shouldUseMongoRepository(): boolean {
  if (process.env.EXPO_REPOSITORY === "memory") {
    return false;
  }

  if (process.env.EXPO_REPOSITORY === "mongo") {
    return true;
  }

  return Boolean(getDatabaseUrl()) && !process.env.VITEST_WORKER_ID;
}

export function getS3Bucket(): string {
  return process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET_NAME ?? "";
}

export function getS3PublicBaseUrl(): string {
  return process.env.AWS_S3_PUBLIC_BASE_URL ?? "";
}

export function getAwsRegion(): string {
  return process.env.AWS_REGION ?? "us-east-1";
}

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (key) {
      values[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }

  return values;
}
