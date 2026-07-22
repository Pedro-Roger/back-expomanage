import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { HttpCnpjLookupClient } from "../contracts/cnpj.client.js";
import { CnpjController } from "./cnpj.controller.js";

describe("CnpjController", () => {
  it("looks up a company by CNPJ", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CnpjController],
      providers: [
        {
          provide: HttpCnpjLookupClient,
          useValue: {
            lookup: async () => ({
              cnpj: "12345678000190",
              legalName: "CAMARAO EVENTOS LTDA",
              address: "AVENIDA BEIRA MAR, 100"
            })
          }
        }
      ]
    }).compile();

    await expect(moduleRef.get(CnpjController).lookup("12.345.678/0001-90")).resolves.toMatchObject({
      cnpj: "12345678000190",
      legalName: "CAMARAO EVENTOS LTDA"
    });
  });
});
