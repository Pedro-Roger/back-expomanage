import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  buildPurchaseProfile,
  type ClientPurchaseProfile,
  type PaymentInstallment
} from "@expomanage/shared";
import { getS3Bucket, getS3PublicBaseUrl } from "../config.js";
import { EXPO_REPOSITORY, type ExpoRepository } from "../repository.js";
import { S3ContractStorage } from "../contracts/s3-contract.storage.js";
import type { ContractStorage } from "../contracts/contracts.types.js";
import type { CreatePurchaseInput, ReceiptUploadInput } from "./purchases.types.js";

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(EXPO_REPOSITORY) private readonly repository: ExpoRepository,
    @Inject(S3ContractStorage) private readonly storage: ContractStorage
  ) {}

  async createFromSignedContract(input: CreatePurchaseInput): Promise<ClientPurchaseProfile> {
    const stand = await this.repository.getStandById(input.standId);

    if (!stand) {
      throw new NotFoundException("Estande não encontrado para criar perfil do cliente.");
    }

    const eventSlug = stand.eventSlug ?? input.eventSlug;
    const paymentConfig = eventSlug ? await this.repository.getPaymentConfig(eventSlug) : undefined;
    const purchase = buildPurchaseProfile({
      eventSlug,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientDocument: input.clientDocument,
      stand,
      contractUrl: input.contractUrl,
      pixCopyPaste: paymentConfig?.pixCopyPaste
    });

    return this.repository.addPurchase(purchase);
  }

  getClientProfile(id: string): Promise<ClientPurchaseProfile> {
    return this.getRequiredPurchase(id);
  }

  async getClientProfileByDocument(document: string): Promise<ClientPurchaseProfile> {
    const profiles = await this.listClientProfilesByDocument(document);

    if (profiles.length === 0) {
      throw new NotFoundException("Compra não encontrada para este CNPJ.");
    }

    return profiles[0];
  }

  async listClientProfilesByDocument(document: string): Promise<ClientPurchaseProfile[]> {
    const digits = document.replace(/\D/g, "");

    if (digits.length !== 14) {
      throw new BadRequestException("CNPJ deve ter 14 dígitos.");
    }

    return this.repository.listPurchasesByClientDocument(digits);
  }

  listAdminPurchases(eventSlug?: string): Promise<ClientPurchaseProfile[]> {
    return this.repository.listPurchases(eventSlug);
  }

  async downloadContract(purchaseId: string): Promise<{ body: Buffer; contentType: string; fileName: string }> {
    const purchase = await this.getRequiredPurchase(purchaseId);
    const key = extractS3KeyFromContractUrl(purchase.contractUrl);
    const asset = await this.storage.downloadObject(key);
    const extension = key.split(".").pop() || "docx";

    return {
      body: asset.body,
      contentType: asset.contentType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: `contrato-${purchase.stand.code}.${extension}`
    };
  }

  async attachReceipt(
    purchaseId: string,
    installmentId: string,
    input: ReceiptUploadInput
  ): Promise<ClientPurchaseProfile> {
    const purchase = await this.getRequiredPurchase(purchaseId);
    const receipt = decodeReceipt(input.dataUrl);
    const asset = await this.storage.uploadObject({
      key: `purchases/${purchaseId}/receipts/${installmentId}-${Date.now()}-${safeFileName(input.fileName)}`,
      body: receipt,
      contentType: input.contentType || "application/octet-stream"
    });
    const updated = updateInstallment(purchase, installmentId, {
      status: "under_review",
      receipt: {
        fileName: input.fileName,
        url: asset.url,
        uploadedAt: new Date().toISOString()
      }
    });

    return this.repository.updatePurchase(updated);
  }

  async markInstallmentPaid(purchaseId: string, installmentId: string): Promise<ClientPurchaseProfile> {
    const purchase = await this.getRequiredPurchase(purchaseId);
    const updated = updateInstallment(purchase, installmentId, { status: "paid" });
    const allPaid = updated.installments.every((installment) => installment.status === "paid");

    return this.repository.updatePurchase({
      ...updated,
      paymentStatus: allPaid ? "Pagamento confirmado" : "Pagamento em aguardo"
    });
  }

  private async getRequiredPurchase(id: string): Promise<ClientPurchaseProfile> {
    const purchase = await this.repository.getPurchaseById(id);

    if (!purchase) {
      throw new NotFoundException("Compra não encontrada.");
    }

    return purchase;
  }
}

function updateInstallment(
  purchase: ClientPurchaseProfile,
  installmentId: string,
  patch: Partial<PaymentInstallment>
): ClientPurchaseProfile {
  let found = false;
  const installments = purchase.installments.map((installment) => {
    if (installment.id !== installmentId) {
      return installment;
    }

    found = true;
    return { ...installment, ...patch };
  });

  if (!found) {
    throw new NotFoundException("Parcela não encontrada.");
  }

  return { ...purchase, installments };
}

function decodeReceipt(value: string): Buffer {
  const [, payload] = value.match(/^data:[^;]+;base64,(.+)$/) ?? [];

  if (!payload) {
    throw new BadRequestException("Comprovante deve ser enviado em base64.");
  }

  return Buffer.from(payload, "base64");
}

function safeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "comprovante";
}

export function extractS3KeyFromContractUrl(value: string): string {
  const publicBaseUrl = getS3PublicBaseUrl().replace(/\/+$/, "");
  const trimmed = value.trim();

  if (trimmed.startsWith("s3://")) {
    const withoutScheme = trimmed.slice("s3://".length);
    return withoutScheme.split("/").slice(1).join("/");
  }

  if (publicBaseUrl && trimmed.startsWith(`${publicBaseUrl}/`)) {
    return trimmed.slice(publicBaseUrl.length + 1);
  }

  try {
    const url = new URL(trimmed);
    const bucket = getS3Bucket();
    const path = url.pathname.replace(/^\/+/, "");

    if (bucket && path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1);
    }

    return path;
  } catch {
    return trimmed.replace(/^\/+/, "");
  }
}
