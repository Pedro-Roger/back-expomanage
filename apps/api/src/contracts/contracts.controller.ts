import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ContractDocumentService } from "./contracts.service.js";
import type { AdminSignatureInput, GenerateContractInput } from "./contracts.types.js";

@Controller("contracts")
export class ContractsController {
  constructor(@Inject(ContractDocumentService) private readonly contracts: ContractDocumentService) {}

  @Post("admin-signature")
  @UseGuards(JwtAuthGuard)
  saveAdminSignature(@Body() input: AdminSignatureInput) {
    return this.contracts.saveAdminSignature(input);
  }

  @Post("generate")
  generateSponsorContract(@Body() input: GenerateContractInput) {
    return this.contracts.generateSponsorContract(input);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listContracts() {
    return this.contracts.listContracts();
  }

  @Get(":id")
  getContract(@Param("id") id: string) {
    return this.contracts.getContract(id);
  }
}
