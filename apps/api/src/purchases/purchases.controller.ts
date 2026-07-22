import { Body, Controller, Get, Header, Inject, Param, Patch, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PurchasesService } from "./purchases.service.js";
import type { CreatePurchaseInput, ReceiptUploadInput } from "./purchases.types.js";

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@Controller("purchases")
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchases: PurchasesService) {}

  @Post()
  createFromSignedContract(@Body() input: CreatePurchaseInput) {
    return this.purchases.createFromSignedContract(input);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listAdminPurchases(@Query("eventSlug") eventSlug?: string) {
    return this.purchases.listAdminPurchases(eventSlug);
  }

  @Get("client/:document")
  getClientProfileByDocument(@Param("document") document: string) {
    return this.purchases.getClientProfileByDocument(document);
  }

  @Get("client/:document/profiles")
  listClientProfilesByDocument(@Param("document") document: string) {
    return this.purchases.listClientProfilesByDocument(document);
  }

  @Get(":id")
  getClientProfile(@Param("id") id: string) {
    return this.purchases.getClientProfile(id);
  }

  @Get(":id/contract/download")
  @Header("Cache-Control", "private, max-age=60")
  async downloadContract(@Param("id") id: string, @Res({ passthrough: true }) response: HeaderResponse) {
    const contract = await this.purchases.downloadContract(id);

    response.setHeader("Content-Type", contract.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${contract.fileName}"`);
    return new StreamableFile(contract.body);
  }

  @Post(":id/installments/:installmentId/receipt")
  attachReceipt(
    @Param("id") id: string,
    @Param("installmentId") installmentId: string,
    @Body() input: ReceiptUploadInput
  ) {
    return this.purchases.attachReceipt(id, installmentId, input);
  }

  @Patch(":id/installments/:installmentId/paid")
  @UseGuards(JwtAuthGuard)
  markInstallmentPaid(@Param("id") id: string, @Param("installmentId") installmentId: string) {
    return this.purchases.markInstallmentPaid(id, installmentId);
  }
}
