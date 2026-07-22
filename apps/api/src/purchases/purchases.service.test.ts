import { describe, expect, it } from "vitest";
import { InMemoryExpoRepository } from "../repository.js";
import { extractS3KeyFromContractUrl, PurchasesService } from "./purchases.service.js";

class FakeReceiptStorage {
  async uploadObject(input: { key: string; body: Buffer; contentType: string }) {
    return {
      key: input.key,
      url: `s3://expomanage/${input.key}`
    };
  }

  async downloadObject(key: string) {
    return {
      body: Buffer.from(`download:${key}`),
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };
  }
}

describe("PurchasesService", () => {
  it("creates a client profile with installments, receives receipts, and lets admin confirm payment", async () => {
    const service = new PurchasesService(new InMemoryExpoRepository(), new FakeReceiptStorage());

    const profile = await service.createFromSignedContract({
      clientName: "Maria Silva",
      clientEmail: "maria@example.com",
      standId: "stand-c-02",
      contractUrl: "s3://contracts/contract-c-02.docx"
    });

    expect(profile.stand.code).toBe("C-02");
    expect(profile.installments.map((installment) => installment.amount)).toEqual([1500, 2000]);
    expect(profile.paymentStatus).toBe("Pagamento em aguardo");

    const withReceipt = await service.attachReceipt(profile.id, "installment-1", {
      fileName: "pix-entrada.png",
      dataUrl: "data:image/png;base64,cGl4",
      contentType: "image/png"
    });

    expect(withReceipt.installments[0]).toMatchObject({
      status: "under_review",
      receipt: {
        fileName: "pix-entrada.png",
        url: expect.stringContaining("/receipts/")
      }
    });

    const paid = await service.markInstallmentPaid(profile.id, "installment-1");

    expect(paid.installments[0].status).toBe("paid");
    expect((await service.getClientProfile(profile.id)).installments[0].status).toBe("paid");
    expect((await service.listAdminPurchases())[0].contractUrl).toBe("s3://contracts/contract-c-02.docx");

    await expect(service.downloadContract(profile.id)).resolves.toMatchObject({
      body: Buffer.from("download:contract-c-02.docx"),
      fileName: "contrato-C-02.docx"
    });
  });

  it("lets a company client recover its profile by CNPJ", async () => {
    const service = new PurchasesService(new InMemoryExpoRepository(), new FakeReceiptStorage());

    const profile = await service.createFromSignedContract({
      clientName: "Bruno Eventos LTDA",
      clientEmail: "contato@brunoeventos.com",
      clientDocument: "12.345.678/0001-99",
      standId: "stand-c-02",
      contractUrl: "s3://contracts/contract-c-02.docx"
    });

    await expect(service.getClientProfileByDocument("12345678000199")).resolves.toMatchObject({
      id: profile.id,
      clientName: "Bruno Eventos LTDA",
      clientDocument: "12345678000199"
    });
  });

  it("lists every purchase for a CNPJ across simultaneous events", async () => {
    const repository = new InMemoryExpoRepository();
    await repository.replaceEventStands("festival-camarao-2026", [
      {
        id: "stand-festival-n-01",
        eventSlug: "festival-camarao-2026",
        code: "N-01",
        size: "3x3",
        status: "reserved",
        type: "Feira de Negócios"
      }
    ]);
    await repository.replaceEventStands("feira-negocios-2026", [
      {
        id: "stand-feira-n-02",
        eventSlug: "feira-negocios-2026",
        code: "N-02",
        size: "3x3",
        status: "reserved",
        type: "Feira de Negócios"
      }
    ]);
    const service = new PurchasesService(repository, new FakeReceiptStorage());

    await service.createFromSignedContract({
      eventSlug: "festival-camarao-2026",
      clientName: "Bruno Eventos LTDA",
      clientEmail: "contato@brunoeventos.com",
      clientDocument: "12.345.678/0001-99",
      standId: "stand-festival-n-01",
      contractUrl: "s3://contracts/festival.docx"
    });
    await service.createFromSignedContract({
      eventSlug: "feira-negocios-2026",
      clientName: "Bruno Eventos LTDA",
      clientEmail: "contato@brunoeventos.com",
      clientDocument: "12.345.678/0001-99",
      standId: "stand-feira-n-02",
      contractUrl: "s3://contracts/feira.docx"
    });

    await expect(service.listClientProfilesByDocument("12.345.678/0001-99")).resolves.toHaveLength(2);
  });

  it("extracts S3 keys from legacy public URLs and S3 URLs", () => {
    process.env.AWS_S3_PUBLIC_BASE_URL = "https://lc-web-quero.s3.us-east-2.amazonaws.com";

    expect(extractS3KeyFromContractUrl("s3://contracts/generated/contract-c-02.docx")).toBe(
      "generated/contract-c-02.docx"
    );
    expect(
      extractS3KeyFromContractUrl("https://lc-web-quero.s3.us-east-2.amazonaws.com/contracts/contract-C-02.docx")
    ).toBe("contracts/contract-C-02.docx");
  });
});
