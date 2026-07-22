import type { ReceitaCompanyRecord } from "./cnpj-open-data.types.js";

export function parseReceitaCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ";" && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function buildReceitaCompanyRecords(input: {
  empresasRows: string[][];
  estabelecimentosRows: string[][];
  importedAt?: string;
}): ReceitaCompanyRecord[] {
  const importedAt = input.importedAt ?? new Date().toISOString();
  const companies = new Map<string, { legalName: string }>();

  for (const row of input.empresasRows) {
    const cnpjBase = onlyDigits(row[0] ?? "");

    if (!cnpjBase) {
      continue;
    }

    companies.set(cnpjBase, {
      legalName: normalize(row[1])
    });
  }

  return input.estabelecimentosRows.flatMap((row) => {
    const cnpjBase = onlyDigits(row[0] ?? "");
    const company = companies.get(cnpjBase);

    if (!company) {
      return [];
    }

    const cnpj = `${cnpjBase}${onlyDigits(row[1] ?? "").padStart(4, "0")}${onlyDigits(row[2] ?? "").padStart(2, "0")}`;
    const addressParts = [
      [normalize(row[14]), normalize(row[15])].filter(Boolean).join(" "),
      normalize(row[16]),
      normalize(row[17]),
      normalize(row[18]),
      [normalize(row[21]), normalize(row[20])].filter(Boolean).join("/"),
      normalize(row[19]) ? `CEP ${normalize(row[19])}` : ""
    ].filter(Boolean);
    const ddd = onlyDigits(row[22] ?? "");
    const phone = onlyDigits(row[23] ?? "");

    return [{
      cnpj,
      cnpjBase,
      legalName: company.legalName,
      tradeName: normalize(row[4]) || undefined,
      status: normalize(row[5]) || undefined,
      address: addressParts.join(", "),
      email: normalize(row[28]).toLowerCase() || undefined,
      phone: ddd && phone ? `(${ddd}) ${phone}` : undefined,
      city: normalize(row[21]) || undefined,
      state: normalize(row[20]) || undefined,
      zipCode: normalize(row[19]) || undefined,
      importedAt
    }];
  });
}

function normalize(value?: string): string {
  return String(value ?? "").trim();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
