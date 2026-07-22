import { describe, expect, it } from "vitest";
import { ContractDocumentService } from "./contracts.service.js";
import type { CnpjLookupClient, ContractStorage } from "./contracts.types.js";

class FakeCnpjClient implements CnpjLookupClient {
  async lookup(cnpj: string) {
    return {
      cnpj,
      legalName: "Camarão Azul LTDA",
      address: "Rua do Porto, 123, Aracati/CE, CEP 62800-000"
    };
  }
}

class FakeStorage implements ContractStorage {
  readonly uploads: { key: string; body: Buffer; contentType: string }[] = [];

  async uploadObject(input: { key: string; body: Buffer; contentType: string }) {
    this.uploads.push(input);
    return {
      key: input.key,
      url: `s3://expomanage/${input.key}`
    };
  }

  async downloadObject(key: string) {
    return {
      body: Buffer.from(key),
      contentType: "application/octet-stream"
    };
  }
}

describe("ContractDocumentService", () => {
  it("fills the shrimp festival contract with CNPJ data and stores contract plus signatures", async () => {
    const storage = new FakeStorage();
    const service = new ContractDocumentService(storage, new FakeCnpjClient());

    await service.saveAdminSignature({
      signerName: "Felipe Mendonça",
      signatureDataUrl: "data:image/png;base64,YXBjYw=="
    });

    const contract = await service.generateSponsorContract({
      sponsor: {
        documentType: "cnpj",
        document: "12.345.678/0001-90",
        representativeName: "Maria Silva",
        representativeRole: "Diretora",
        representativeRg: "200200200",
        representativeCpf: "123.456.789-01",
        phone: "(85) 99999-0000",
        email: "maria@camaraoazul.com"
      },
      stand: {
        code: "B-10",
        size: "5x5",
        area: 25
      },
      sponsorSignatureDataUrl: "data:image/png;base64,cGF0cm9jaW5hZG9y"
    });

    expect(contract.sponsor.legalName).toBe("Camarão Azul LTDA");
    expect(contract.contractUrl).toBe(`s3://expomanage/${contract.contractKey}`);
    expect(contract.sponsorSignatureUrl).toContain("/signatures/sponsor-");
    expect(contract.adminSignatureUrl).toContain("/signatures/apcc-");
    expect(storage.uploads.map((upload) => upload.contentType)).toEqual([
      "image/png",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]);

    const documentXml = await extractDocumentXml(storage.uploads[2].body);
    expect(documentXml).toContain("Camarão Azul LTDA");
    expect(documentXml).toContain("12.345.678/0001-90");
    expect(documentXml).toContain("Rua do Porto, 123, Aracati/CE, CEP 62800-000");
    expect(documentXml).toContain("B-10");
    expect(documentXml).toContain("5x5");
    expect(documentXml).toContain("Maria Silva");
  });
});

async function extractDocumentXml(docx: Buffer): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file("word/document.xml")?.async("string");

  if (!xml) {
    throw new Error("DOCX sem word/document.xml");
  }

  return xml;
}
