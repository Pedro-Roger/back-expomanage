import { describe, expect, it } from "vitest";
import {
  buildDashboardStats,
  buildPurchaseProfile,
  buildSignatureRecord,
  filterStands,
  formatCurrency,
  generateStandsFromBatches,
  sampleLeads,
  sampleStands,
  validateLeadInput
} from "./index";

describe("shared stand helpers", () => {
  it("filters stands by code, size, and status", () => {
    const result = filterStands(sampleStands, {
      search: "c",
      size: "64m²",
      status: "available"
    });

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("C-02");
  });

  it("reports validation errors for incomplete lead input", () => {
    const errors = validateLeadInput({
      name: "",
      documentType: "cpf",
      document: "123",
      phone: "",
      email: "bad-mail",
      standId: "stand-a-04"
    });

    expect(errors).toEqual([
      "Informe nome completo ou razão social.",
      "Informe um telefone.",
      "Informe um e-mail válido.",
      "CPF deve ter 11 dígitos."
    ]);
  });

  it("requires a selected stand before lead submission", () => {
    const errors = validateLeadInput({
      name: "Ana Martins",
      documentType: "cpf",
      document: "12345678901",
      phone: "(85) 99999-0001",
      email: "ana@example.com",
      standId: ""
    });

    expect(errors).toEqual(["Selecione um estande disponível."]);
  });

  it("builds dashboard stats from stands and leads", () => {
    expect(buildDashboardStats(sampleStands, sampleLeads)).toEqual({
      totalStands: 6,
      availableStands: 3,
      soldStands: 2,
      reservedStands: 1,
      totalLeads: 3,
      newLeads: 2
    });
  });

  it("generates stands from the event batch setup", () => {
    const stands = generateStandsFromBatches([
      { quantity: 80, size: "3x3", type: "Feira de Negócios", prefix: "N" },
      { quantity: 10, size: "Barraca", type: "Feira Gastronômica", prefix: "G" }
    ]);

    expect(stands).toHaveLength(90);
    expect(stands[0]).toMatchObject({
      id: "stand-n-01",
      code: "N-01",
      size: "3x3",
      width: 3,
      length: 3,
      area: 9,
      status: "available",
      type: "Feira de Negócios"
    });
    expect(stands[80]).toMatchObject({
      id: "stand-g-01",
      code: "G-01",
      size: "Barraca",
      status: "available",
      type: "Feira Gastronômica"
    });
    expect(stands[79].code).toBe("N-80");
    expect(stands[89].code).toBe("G-10");
  });

  it("formats BRL currency", () => {
    expect(formatCurrency(482000)).toBe("R$ 482.000,00");
  });

  it("builds a client purchase profile with two pending payment installments", () => {
    const profile = buildPurchaseProfile({
      clientName: "Maria Silva",
      clientEmail: "maria@example.com",
      stand: { id: "stand-b-10", code: "B-10", size: "5x5", status: "available" },
      contractUrl: "s3://contracts/contract-b-10.docx"
    });

    expect(profile.paymentStatus).toBe("Pagamento em aguardo");
    expect(profile.installments).toEqual([
      expect.objectContaining({
        id: "installment-1",
        label: "1ª parcela",
        amount: 1500,
        dueLabel: "Imediato",
        status: "waiting_receipt"
      }),
      expect.objectContaining({
        id: "installment-2",
        label: "2ª parcela",
        amount: 2000,
        dueLabel: "Agosto/2026",
        status: "waiting_receipt"
      })
    ]);
  });

  it("builds a digital signature record with date, time, and location", () => {
    const record = buildSignatureRecord({
      signerName: "Pedro Roger",
      signerDocument: "123.456.789-01",
      standCode: "C-02",
      signedAt: new Date("2026-07-18T23:40:00.000Z"),
      latitude: -3.7319,
      longitude: -38.5267,
      accuracy: 12
    });

    expect(record).toEqual({
      id: "sig-2026-07-18T23:40:00.000Z-C-02",
      signerName: "Pedro Roger",
      signerDocument: "123.456.789-01",
      standCode: "C-02",
      signedAt: "2026-07-18T23:40:00.000Z",
      signedDate: "18/07/2026",
      signedTime: "23:40:00",
      latitude: -3.7319,
      longitude: -38.5267,
      accuracy: 12
    });
  });
});
