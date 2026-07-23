import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpCnpjLookupClient } from "./cnpj.client.js";
import { ReceitaCnpjMongoRepository } from "../cnpj-open-data.repository.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("HttpCnpjLookupClient", () => {
  it("falls back to the public OpenCNPJ API when the imported base has no match", async () => {
    vi.stubEnv("CNPJ_API_URL", "");
    vi.spyOn(ReceitaCnpjMongoRepository.prototype, "findByCnpj").mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toBe("https://api.opencnpj.org/07206816000115");

        return new Response(
          JSON.stringify({
            razao_social: "PEDRO ROGER EVENTOS LTDA",
            logradouro: "AVENIDA BEIRA MAR",
            numero: "100",
            municipio: "FORTALEZA",
            uf: "ce",
            cep: "60000-000"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const client = new HttpCnpjLookupClient();
    await expect(client.lookup("07.206.816/0001-15")).resolves.toEqual({
      cnpj: "07206816000115",
      legalName: "PEDRO ROGER EVENTOS LTDA",
      address: "AVENIDA BEIRA MAR, 100, FORTALEZA, CE, CEP 60000-000"
    });
  });
});
