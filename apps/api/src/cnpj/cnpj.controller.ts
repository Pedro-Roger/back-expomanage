import { Controller, Get, Inject, Param } from "@nestjs/common";
import { HttpCnpjLookupClient } from "../contracts/cnpj.client.js";

@Controller("cnpj")
export class CnpjController {
  constructor(@Inject(HttpCnpjLookupClient) private readonly cnpj: HttpCnpjLookupClient) {}

  @Get(":cnpj")
  lookup(@Param("cnpj") cnpj: string) {
    return this.cnpj.lookup(cnpj);
  }
}
