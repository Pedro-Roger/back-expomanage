import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { HttpCnpjLookupClient } from "./cnpj.client.js";
import { S3ContractStorage } from "./s3-contract.storage.js";
import type {
  AdminSignatureInput,
  CnpjLookupClient,
  ContractRecord,
  ContractStorage,
  GenerateContractInput,
  SponsorInput
} from "./contracts.types.js";

const contractTemplatePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../templates/contrato-patrocinio-festival-camarao-2026.docx"
);

@Injectable()
export class ContractDocumentService {
  private adminSignature?: {
    signerName: string;
    asset: { key: string; url: string };
  };
  private contracts: ContractRecord[] = [];

  constructor(
    @Inject(S3ContractStorage) private readonly storage: ContractStorage,
    @Inject(HttpCnpjLookupClient) private readonly cnpjClient: CnpjLookupClient
  ) {}

  async saveAdminSignature(input: AdminSignatureInput) {
    const signature = decodeDataUrl(input.signatureDataUrl);
    const asset = await this.storage.uploadObject({
      key: `contracts/signatures/apcc-${Date.now()}.png`,
      body: signature,
      contentType: "image/png"
    });

    this.adminSignature = {
      signerName: input.signerName.trim(),
      asset
    };

    return {
      signerName: this.adminSignature.signerName,
      signatureKey: asset.key,
      signatureUrl: asset.url
    };
  }

  async generateSponsorContract(input: GenerateContractInput): Promise<ContractRecord> {
    const sponsor = await this.resolveSponsor(input.sponsor);
    const sponsorSignature = await this.storage.uploadObject({
      key: `contracts/signatures/sponsor-${Date.now()}.png`,
      body: decodeDataUrl(input.sponsorSignatureDataUrl),
      contentType: "image/png"
    });
    const documentBuffer = await this.buildContractDocx({
      sponsor,
      standCode: input.stand.code,
      standSize: input.stand.size,
      sponsorSignatureUrl: sponsorSignature.url,
      adminSignatureUrl: this.adminSignature?.asset.url
    });
    const contractId = `contract-${Date.now()}-${slugify(input.stand.code)}`;
    const contractAsset = await this.storage.uploadObject({
      key: `contracts/generated/${contractId}.docx`,
      body: documentBuffer,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    const record: ContractRecord = {
      id: contractId,
      sponsor,
      stand: input.stand,
      contractKey: contractAsset.key,
      contractUrl: contractAsset.url,
      sponsorSignatureKey: sponsorSignature.key,
      sponsorSignatureUrl: sponsorSignature.url,
      adminSignatureKey: this.adminSignature?.asset.key,
      adminSignatureUrl: this.adminSignature?.asset.url,
      createdAt: new Date().toISOString()
    };

    this.contracts = [record, ...this.contracts];
    return record;
  }

  listContracts(): ContractRecord[] {
    return structuredClone(this.contracts);
  }

  getContract(id: string): ContractRecord {
    const contract = this.contracts.find((item) => item.id === id);

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    return structuredClone(contract);
  }

  private async resolveSponsor(input: SponsorInput): Promise<SponsorInput> {
    if (input.documentType !== "cnpj") {
      return normalizeSponsor(input);
    }

    if (input.legalName?.trim() && input.address?.trim()) {
      return normalizeSponsor(input);
    }

    const company = await this.cnpjClient.lookup(input.document);

    return normalizeSponsor({
      ...input,
      legalName: input.legalName || company.legalName,
      address: input.address || company.address
    });
  }

  private async buildContractDocx(input: {
    sponsor: SponsorInput;
    standCode: string;
    standSize: string;
    sponsorSignatureUrl: string;
    adminSignatureUrl?: string;
  }): Promise<Buffer> {
    const zip = await JSZip.loadAsync(readFileSync(contractTemplatePath));
    const document = zip.file("word/document.xml");

    if (!document) {
      throw new Error("Template DOCX inválido: word/document.xml não encontrado.");
    }

    const sponsor = input.sponsor;
    const replacements: Record<string, string> = {
      "RAZÃO SOCIAL": sponsor.legalName ?? "",
      "XX.XXX.XXX/XXXX-XX": sponsor.document,
      "CARGO": sponsor.representativeRole,
      "NOME": sponsor.representativeName,
      "RG nº XXXXXXXXXXXXXX": `RG nº ${sponsor.representativeRg}`,
      "XXXXXXXXXXXXXX": sponsor.representativeRg,
      "CPF nº XXX.XXX.XXX-XX": `CPF nº ${sponsor.representativeCpf}`,
      "XXX.XXX.XXX-XX": sponsor.representativeCpf,
      "(XX) XXXXX.XXXX": sponsor.phone,
      "XXXXXXXXXXXXXXXX@XXXXXX.XXX": sponsor.email,
      "8 (oito) m²": input.standSize,
      "número XX": `número ${input.standCode}`,
      "XX": input.standCode
    };
    let xml = await document.async("string");
    xml = replaceAllText(xml, "ENDEREÇO", sponsor.address ?? "");

    for (const [search, value] of Object.entries(replacements)) {
      xml = replaceAllText(xml, search, value);
    }

    xml = appendSignatureProof(xml, {
      sponsorName: sponsor.representativeName,
      standCode: input.standCode,
      standSize: input.standSize,
      sponsorSignatureUrl: input.sponsorSignatureUrl,
      adminSignatureUrl: input.adminSignatureUrl
    });
    zip.file("word/document.xml", xml);
    return zip.generateAsync({ type: "nodebuffer" });
  }
}

function normalizeSponsor(input: SponsorInput): SponsorInput {
  return {
    ...input,
    document: input.document.trim(),
    legalName: input.legalName?.trim(),
    address: input.address?.trim(),
    representativeName: input.representativeName.trim(),
    representativeRole: input.representativeRole.trim(),
    representativeRg: input.representativeRg.trim(),
    representativeCpf: input.representativeCpf.trim(),
    phone: input.phone.trim(),
    email: input.email.trim()
  };
}

function replaceAllText(xml: string, search: string, value: string): string {
  return xml.split(escapeXml(search)).join(escapeXml(value));
}

function decodeDataUrl(value: string): Buffer {
  const match = value.match(/^data:image\/png;base64,(.+)$/);

  if (!match) {
    throw new BadRequestException("Assinatura deve ser enviada como PNG em base64.");
  }

  return Buffer.from(match[1], "base64");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function appendSignatureProof(
  xml: string,
  input: { sponsorName: string; standCode: string; standSize: string; sponsorSignatureUrl: string; adminSignatureUrl?: string }
): string {
  const proof = [
    `Contrato gerado para estande ${input.standCode} (${input.standSize}).`,
    "Assinatura digital do PATROCINADOR:",
    `${input.sponsorName} - ${input.sponsorSignatureUrl}`,
    input.adminSignatureUrl ? "Assinatura digital da APCC:" : "Assinatura da APCC pendente",
    input.adminSignatureUrl
  ]
    .filter((line): line is string => Boolean(line))
    .map((line) => `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");

  if (xml.includes("<w:sectPr")) {
    return xml.replace("<w:sectPr", `${proof}<w:sectPr`);
  }

  return xml.replace("</w:body>", `${proof}</w:body>`);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
