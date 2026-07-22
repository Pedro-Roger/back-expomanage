import { describe, expect, it } from "vitest";
import { parseLatestPeriod, parseZipLinks } from "./sync-receita-cnpj.js";

describe("Receita CNPJ sync helpers", () => {
  it("selects the latest monthly period from the official listing", () => {
    const html = '<a href="2026-04/">2026-04/</a><a href="2026-06/">2026-06/</a><a href="2026-05/">2026-05/</a>';

    expect(parseLatestPeriod(html)).toBe("2026-06");
  });

  it("extracts Empresas and Estabelecimentos zip links", () => {
    const html = [
      '<a href="Empresas0.zip">Empresas0.zip</a>',
      '<a href="Estabelecimentos0.zip">Estabelecimentos0.zip</a>',
      '<a href="Socios0.zip">Socios0.zip</a>'
    ].join("");

    expect(parseZipLinks(html, "https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/2026-06/")).toEqual({
      empresas: ["https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/2026-06/Empresas0.zip"],
      estabelecimentos: ["https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/2026-06/Estabelecimentos0.zip"]
    });
  });
});
