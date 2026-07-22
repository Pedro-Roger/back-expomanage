export interface CreatePurchaseInput {
  eventSlug?: string;
  clientName: string;
  clientEmail: string;
  clientDocument?: string;
  standId: string;
  contractUrl: string;
}

export interface ReceiptUploadInput {
  fileName: string;
  dataUrl: string;
  contentType: string;
}
