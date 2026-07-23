export type SponsorDocumentType = "cpf" | "cnpj";

export interface SponsorInput {
  documentType: SponsorDocumentType;
  document: string;
  legalName?: string;
  address?: string;
  representativeName: string;
  representativeRole: string;
  representativeRg: string;
  representativeCpf: string;
  phone: string;
  email: string;
}

export interface ContractStandInput {
  code: string;
  size: string;
  area?: number;
}

export interface GenerateContractInput {
  sponsor: SponsorInput;
  stand: ContractStandInput;
  sponsorSignatureDataUrl: string;
}

export interface AdminSignatureInput {
  signerName: string;
  signatureDataUrl: string;
}

export interface CnpjCompanyData {
  cnpj: string;
  legalName: string;
  address: string;
}

export interface CnpjLookupClient {
  lookup(cnpj: string): Promise<CnpjCompanyData>;
}

export interface StoredAsset {
  key: string;
  url: string;
}

export interface ContractStorage {
  uploadObject(input: { key: string; body: Buffer; contentType: string }): Promise<StoredAsset>;
  downloadObject(key: string): Promise<{ body: Buffer; contentType?: string }>;
}

export interface ContractRecord {
  id: string;
  sponsor: SponsorInput;
  stand: ContractStandInput;
  contractKey: string;
  contractUrl: string;
  sponsorSignatureKey: string;
  sponsorSignatureUrl: string;
  adminSignatureKey?: string;
  adminSignatureUrl?: string;
  createdAt: string;
}
