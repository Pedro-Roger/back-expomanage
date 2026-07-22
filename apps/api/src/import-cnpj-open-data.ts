import "reflect-metadata";
import { createReadStream } from "node:fs";
import { basename } from "node:path";
import { createInterface } from "node:readline";
import { loadEnvFiles } from "./config.js";
import { buildReceitaCompanyRecords, parseReceitaCsvLine } from "./cnpj-open-data.parser.js";
import { ReceitaCnpjMongoRepository } from "./cnpj-open-data.repository.js";

type ImportArgs = {
  empresas: string[];
  estabelecimentos: string[];
};

const batchSize = 1000;

export async function importCnpjOpenData(args: ImportArgs): Promise<number> {
  loadEnvFiles();

  if (args.empresas.length === 0 || args.estabelecimentos.length === 0) {
    throw new Error("Informe ao menos um --empresas e um --estabelecimentos com arquivos CSV descompactados da Receita.");
  }

  const empresas = await loadEmpresas(args.empresas);
  const repository = new ReceitaCnpjMongoRepository();
  let imported = 0;

  try {
    for (const file of args.estabelecimentos) {
      let rows: string[][] = [];

      for await (const row of readReceitaCsv(file)) {
        rows.push(row);

        if (rows.length >= batchSize) {
          imported += await persistBatch(repository, empresas, rows);
          rows = [];
          console.log(`Importados ${imported} CNPJs...`);
        }
      }

      imported += await persistBatch(repository, empresas, rows);
      console.log(`Arquivo ${basename(file)} concluído. Total importado/atualizado: ${imported}`);
    }
  } finally {
    await repository.close();
  }

  return imported;
}

async function main() {
  await importCnpjOpenData(parseArgs(process.argv.slice(2)));
}

async function loadEmpresas(files: string[]): Promise<Map<string, string[]>> {
  const empresas = new Map<string, string[]>();

  for (const file of files) {
    for await (const row of readReceitaCsv(file)) {
      const cnpjBase = onlyDigits(row[0] ?? "");

      if (cnpjBase) {
        empresas.set(cnpjBase, row);
      }
    }

    console.log(`Empresas carregadas de ${basename(file)}: ${empresas.size}`);
  }

  return empresas;
}

async function persistBatch(
  repository: ReceitaCnpjMongoRepository,
  empresas: Map<string, string[]>,
  estabelecimentosRows: string[][]
): Promise<number> {
  const empresasRows = estabelecimentosRows.flatMap((row) => {
    const empresa = empresas.get(onlyDigits(row[0] ?? ""));
    return empresa ? [empresa] : [];
  });
  const companies = buildReceitaCompanyRecords({ empresasRows, estabelecimentosRows });
  return repository.upsertCompanies(companies);
}

async function* readReceitaCsv(file: string): AsyncGenerator<string[]> {
  const stream = createReadStream(file, { encoding: "latin1" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (line.trim()) {
      yield parseReceitaCsvLine(line);
    }
  }
}

function parseArgs(values: string[]): ImportArgs {
  const args: ImportArgs = { empresas: [], estabelecimentos: [] };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const next = values[index + 1];

    if (value === "--empresas" && next) {
      args.empresas.push(next);
      index += 1;
      continue;
    }

    if (value === "--estabelecimentos" && next) {
      args.estabelecimentos.push(next);
      index += 1;
    }
  }

  return args;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

if (process.argv[1]?.endsWith("import-cnpj-open-data.ts") || process.argv[1]?.endsWith("import-cnpj-open-data.js")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
