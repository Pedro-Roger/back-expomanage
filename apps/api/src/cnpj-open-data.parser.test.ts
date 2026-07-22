import { describe, expect, it } from "vitest";
import { buildReceitaCompanyRecords, parseReceitaCsvLine } from "./cnpj-open-data.parser.js";

describe("Receita CNPJ open data parser", () => {
  it("parses semicolon CSV lines with quoted fields", () => {
    expect(parseReceitaCsvLine('"12345678";"EMPRESA; TESTE";"2062"')).toEqual([
      "12345678",
      "EMPRESA; TESTE",
      "2062"
    ]);
  });

  it("joins Empresas and Estabelecimentos rows into lookup records", () => {
    const records = buildReceitaCompanyRecords({
      empresasRows: [
        ["12345678", "CAMARAO EVENTOS LTDA", "2062", "49", "10000,00", "01", ""]
      ],
      estabelecimentosRows: [
        [
          "12345678",
          "0001",
          "90",
          "1",
          "CAMARAO FEST",
          "02",
          "20200101",
          "00",
          "",
          "",
          "",
          "20190510",
          "8230001",
          "",
          "AVENIDA",
          "BEIRA MAR",
          "100",
          "SALA 1",
          "MEIRELES",
          "60165120",
          "CE",
          "1389",
          "85",
          "999999999",
          "",
          "",
          "",
          "",
          "contato@camaraofest.com.br",
          "",
          ""
        ]
      ]
    });

    expect(records).toEqual([
      expect.objectContaining({
        cnpj: "12345678000190",
        cnpjBase: "12345678",
        legalName: "CAMARAO EVENTOS LTDA",
        tradeName: "CAMARAO FEST",
        status: "02",
        state: "CE",
        city: "1389",
        zipCode: "60165120",
        email: "contato@camaraofest.com.br",
        phone: "(85) 999999999",
        address: "AVENIDA BEIRA MAR, 100, SALA 1, MEIRELES, 1389/CE, CEP 60165120"
      })
    ]);
  });
});
