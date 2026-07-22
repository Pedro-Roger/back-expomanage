import "reflect-metadata";
import { createWriteStream, existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { loadEnvFiles } from "./config.js";
import { importCnpjOpenData } from "./import-cnpj-open-data.js";

type ZipLinks = {
  empresas: string[];
  estabelecimentos: string[];
};

type SyncArgs = {
  period?: string;
  targetDir: string;
  skipDownload: boolean;
};

const defaultBaseUrl = "https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/";

export function parseLatestPeriod(html: string): string {
  const periods = Array.from(html.matchAll(/href=["'](\d{4}-\d{2})\/?["']/g), (match) => match[1]).sort();
  const latest = periods.at(-1);

  if (!latest) {
    throw new Error("Não encontrei pastas mensais no índice da Receita.");
  }

  return latest;
}

export function parseZipLinks(html: string, periodUrl: string): ZipLinks {
  const hrefs = Array.from(html.matchAll(/href=["']([^"']+\.zip)["']/gi), (match) => match[1]);
  const toAbsolute = (href: string) => new URL(href, periodUrl).toString();

  return {
    empresas: hrefs.filter((href) => /empresas\d*\.zip$/i.test(href)).map(toAbsolute),
    estabelecimentos: hrefs.filter((href) => /estabelecimentos\d*\.zip$/i.test(href)).map(toAbsolute)
  };
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.RECEITA_CNPJ_BASE_URL || defaultBaseUrl;
  const period = args.period || parseLatestPeriod(await fetchText(baseUrl));
  const periodUrl = new URL(`${period}/`, baseUrl).toString();
  const workDir = resolve(args.targetDir, period);
  const zipDir = join(workDir, "zips");
  const extractDir = join(workDir, "extracted");

  mkdirSync(zipDir, { recursive: true });
  mkdirSync(extractDir, { recursive: true });

  if (!args.skipDownload) {
    const links = parseZipLinks(await fetchText(periodUrl), periodUrl);

    if (links.empresas.length === 0 || links.estabelecimentos.length === 0) {
      throw new Error(`Não encontrei Empresas*.zip e Estabelecimentos*.zip em ${periodUrl}`);
    }

    for (const url of [...links.empresas, ...links.estabelecimentos]) {
      const destination = join(zipDir, basename(new URL(url).pathname));
      await downloadFile(url, destination);
      await unzipFile(destination, extractDir);
    }
  }

  const files = readdirSync(extractDir).map((file) => join(extractDir, file));
  const empresas = files.filter((file) => /empre/i.test(basename(file)));
  const estabelecimentos = files.filter((file) => /estabele/i.test(basename(file)));

  if (empresas.length === 0 || estabelecimentos.length === 0) {
    throw new Error(`Arquivos extraídos não encontrados em ${extractDir}`);
  }

  const imported = await importCnpjOpenData({ empresas, estabelecimentos });
  console.log(`Sincronização concluída. CNPJs importados/atualizados: ${imported}`);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao acessar ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

async function downloadFile(url: string, destination: string): Promise<void> {
  if (existsSync(destination)) {
    console.log(`Download já existe: ${destination}`);
    return;
  }

  console.log(`Baixando ${url}`);
  const response = await fetch(url);

  if (!response.ok || !response.body) {
    throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  }

  await pipeline(response.body as unknown as NodeJS.ReadableStream, createWriteStream(destination));
}

async function unzipFile(zipPath: string, destination: string): Promise<void> {
  console.log(`Descompactando ${zipPath}`);
  await new Promise<void>((resolvePromise, reject) => {
    const unzip = spawn("unzip", ["-o", "-q", zipPath, "-d", destination], { stdio: "inherit" });
    unzip.on("error", reject);
    unzip.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`unzip saiu com código ${code}`));
    });
  });
}

function parseArgs(values: string[]): SyncArgs {
  const args: SyncArgs = {
    targetDir: "data/receita-cnpj",
    skipDownload: false
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const next = values[index + 1];

    if (value === "--period" && next) {
      args.period = next;
      index += 1;
      continue;
    }

    if (value === "--dir" && next) {
      args.targetDir = next;
      index += 1;
      continue;
    }

    if (value === "--skip-download") {
      args.skipDownload = true;
    }
  }

  return args;
}

if (process.argv[1]?.endsWith("sync-receita-cnpj.ts") || process.argv[1]?.endsWith("sync-receita-cnpj.js")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
