export type StandStatus = "available" | "sold" | "reserved";
export type ServiceStatus = "new" | "contacting" | "finished";
export type DocumentType = "cpf" | "cnpj";
export type PersonType = "individual" | "company";
export type PaymentInstallmentStatus = "waiting_receipt" | "under_review" | "paid";

export interface InstallmentPlanItem {
  label: string;
  amount: number;
  dueLabel: string;
}

export interface Stand {
  id: string;
  eventSlug?: string;
  code: string;
  size: string;
  width?: number;
  length?: number;
  area?: number;
  price?: number;
  status: StandStatus;
  exhibitor?: string;
  type?: string;
  batchId?: string;
  installments?: InstallmentPlanItem[];
}

export interface ExpoEvent {
  slug: string;
  name: string;
  year?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventStandBatch {
  id?: string;
  quantity: number;
  size: string;
  type: string;
  prefix?: string;
  price?: number;
  installments?: InstallmentPlanItem[];
}

export interface Lead {
  id: string;
  eventSlug?: string;
  name: string;
  personType: PersonType;
  documentType: DocumentType;
  document: string;
  phone: string;
  email: string;
  standId: string;
  standCode: string;
  standSize: string;
  serviceStatus: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadInput {
  name: string;
  eventSlug?: string;
  personType?: PersonType;
  documentType: DocumentType;
  document: string;
  phone: string;
  email: string;
  standId: string;
}

export interface StandFilters {
  eventSlug?: string;
  search?: string;
  size?: string;
  status?: StandStatus | "all";
}

export interface DashboardStats {
  totalStands: number;
  availableStands: number;
  soldStands: number;
  reservedStands: number;
  totalLeads: number;
  newLeads: number;
}

export interface SignatureInput {
  signerName: string;
  signerDocument: string;
  standCode: string;
  signedAt: Date;
  latitude: number;
  longitude: number;
  accuracy?: number;
  signaturePath?: string;
}

export interface SignatureRecord {
  id: string;
  signerName: string;
  signerDocument: string;
  standCode: string;
  signedAt: string;
  signedDate: string;
  signedTime: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  signaturePath?: string;
}

export interface PaymentReceipt {
  fileName: string;
  url: string;
  uploadedAt: string;
}

export interface PaymentInstallment {
  id: string;
  label: string;
  amount: number;
  dueLabel: string;
  status: PaymentInstallmentStatus;
  receipt?: PaymentReceipt;
}

export interface EventPaymentConfig {
  eventSlug: string;
  pixCopyPaste: string;
  installments: InstallmentPlanItem[];
}

export interface ClientPurchaseProfile {
  id: string;
  eventSlug?: string;
  clientName: string;
  clientEmail: string;
  clientDocument?: string;
  stand: Pick<Stand, "id" | "code" | "size">;
  contractUrl: string;
  pixCopyPaste?: string;
  paymentStatus: "Pagamento em aguardo" | "Pagamento confirmado";
  installments: PaymentInstallment[];
}

export interface PurchaseProfileInput {
  eventSlug?: string;
  clientName: string;
  clientEmail: string;
  clientDocument?: string;
  stand: Pick<Stand, "id" | "code" | "size" | "status" | "installments">;
  contractUrl: string;
  pixCopyPaste?: string;
}

export const standStatusLabels: Record<StandStatus, string> = {
  available: "Disponível",
  sold: "Vendido",
  reserved: "Reservado"
};

export const serviceStatusLabels: Record<ServiceStatus, string> = {
  new: "Novo",
  contacting: "Em contato",
  finished: "Finalizado"
};

export const paymentInstallmentStatusLabels: Record<PaymentInstallmentStatus, string> = {
  waiting_receipt: "Aguardando comprovante",
  under_review: "Em análise",
  paid: "Paga"
};

export const defaultEventStandBatches: EventStandBatch[] = [
  {
    id: "negocios",
    quantity: 80,
    size: "3x3",
    type: "Feira de Negócios",
    prefix: "N",
    price: 3500,
    installments: defaultPaymentInstallments()
  },
  {
    id: "gastronomia",
    quantity: 10,
    size: "Barraca",
    type: "Feira Gastronômica",
    prefix: "G",
    price: 3500,
    installments: defaultPaymentInstallments()
  }
];

export const defaultExpoEvent: ExpoEvent = {
  slug: "expo-fortaleza-2026",
  name: "Expo Fortaleza 2026",
  year: 2026
};

export const defaultPixCopyPaste =
  "00020126580014BR.GOV.BCB.PIX0136festival-camarao@apcc.org.br52040000530398654071500.005802BR5925APCC FESTIVAL DO CAMARAO6009FORTALEZA62070503***6304ABCD";

export function defaultPaymentInstallments() {
  return [
    { label: "1ª parcela", amount: 1500, dueLabel: "Imediato" },
    { label: "2ª parcela", amount: 2000, dueLabel: "Agosto/2026" }
  ];
}

export const sampleStands: Stand[] = [
  {
    id: "stand-a-04",
    code: "A-04",
    size: "18m²",
    width: 3,
    length: 6,
    area: 18,
    price: 7200,
    status: "sold",
    exhibitor: "TechSolutions S.A.",
    type: "Esquina"
  },
  {
    id: "stand-b-12",
    code: "B-12",
    size: "9m²",
    width: 3,
    length: 3,
    area: 9,
    price: 3500,
    status: "reserved",
    exhibitor: "Reserva Interna (Gov)",
    type: "Básico"
  },
  {
    id: "stand-c-02",
    code: "C-02",
    size: "64m²",
    width: 8,
    length: 8,
    area: 64,
    price: 28000,
    status: "available",
    type: "Ilha"
  },
  {
    id: "stand-d-18",
    code: "D-18",
    size: "12m²",
    width: 3,
    length: 4,
    area: 12,
    price: 4800,
    status: "available",
    type: "Básico"
  },
  {
    id: "stand-e-21",
    code: "E-21",
    size: "18m²",
    width: 3,
    length: 6,
    area: 18,
    price: 7200,
    status: "sold",
    exhibitor: "Agro Norte",
    type: "Corredor"
  },
  {
    id: "stand-f-07",
    code: "F-07",
    size: "9m²",
    width: 3,
    length: 3,
    area: 9,
    price: 3500,
    status: "available",
    type: "Básico"
  }
];

export const sampleLeads: Lead[] = [
  {
    id: "lead-001",
    name: "Ana Martins",
    personType: "individual",
    documentType: "cpf",
    document: "12345678901",
    phone: "(85) 99999-0001",
    email: "ana@example.com",
    standId: "stand-c-02",
    standCode: "C-02",
    standSize: "64m²",
    serviceStatus: "new",
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-18T10:00:00.000Z"
  },
  {
    id: "lead-002",
    name: "Bruno Eventos LTDA",
    personType: "company",
    documentType: "cnpj",
    document: "12345678000199",
    phone: "(85) 98888-0002",
    email: "contato@brunoeventos.com",
    standId: "stand-f-07",
    standCode: "F-07",
    standSize: "9m²",
    serviceStatus: "new",
    createdAt: "2026-07-18T11:00:00.000Z",
    updatedAt: "2026-07-18T11:00:00.000Z"
  },
  {
    id: "lead-003",
    name: "Carla Souza",
    personType: "individual",
    documentType: "cpf",
    document: "98765432100",
    phone: "(85) 97777-0003",
    email: "carla@example.com",
    standId: "stand-d-18",
    standCode: "D-18",
    standSize: "12m²",
    serviceStatus: "contacting",
    createdAt: "2026-07-18T12:00:00.000Z",
    updatedAt: "2026-07-18T12:00:00.000Z"
  }
];

export function filterStands(stands: Stand[], filters: StandFilters): Stand[] {
  const search = filters.search?.trim().toLowerCase();

  return stands.filter((stand) => {
    const matchesSearch = !search || stand.code.toLowerCase().includes(search);
    const matchesSize = !filters.size || stand.size === filters.size;
    const matchesStatus =
      !filters.status || filters.status === "all" || stand.status === filters.status;

    return matchesSearch && matchesSize && matchesStatus;
  });
}

export function validateLeadInput(input: LeadInput): string[] {
  const errors: string[] = [];
  const documentValue = String(input.document ?? "");
  const email = String(input.email ?? "");
  const name = String(input.name ?? "");
  const phone = String(input.phone ?? "");
  const standId = String(input.standId ?? "");
  const digits = documentValue.replace(/\D/g, "");

  if (!name.trim()) {
    errors.push("Informe nome completo ou razão social.");
  }

  if (!phone.trim()) {
    errors.push("Informe um telefone.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Informe um e-mail válido.");
  }

  if (!standId.trim()) {
    errors.push("Selecione um estande disponível.");
  }

  if (input.documentType === "cpf" && digits.length !== 11) {
    errors.push("CPF deve ter 11 dígitos.");
  }

  if (input.documentType === "cnpj" && digits.length !== 14) {
    errors.push("CNPJ deve ter 14 dígitos.");
  }

  return errors;
}

export function buildDashboardStats(stands: Stand[], leads: Lead[]): DashboardStats {
  return {
    totalStands: stands.length,
    availableStands: stands.filter((stand) => stand.status === "available").length,
    soldStands: stands.filter((stand) => stand.status === "sold").length,
    reservedStands: stands.filter((stand) => stand.status === "reserved").length,
    totalLeads: leads.length,
    newLeads: leads.filter((lead) => lead.serviceStatus === "new").length
  };
}

export function buildPurchaseProfile(input: PurchaseProfileInput): ClientPurchaseProfile {
  const eventPrefix = input.eventSlug ? `${input.eventSlug}-` : "";
  const plan = input.stand.installments?.length ? input.stand.installments : defaultPaymentInstallments();
  const installments: PaymentInstallment[] = plan.map((installment, index) => ({
    id: `installment-${index + 1}`,
    ...installment,
    status: "waiting_receipt"
  }));

  return {
    id: `purchase-${eventPrefix}${input.stand.id}`,
    eventSlug: input.eventSlug,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim(),
    clientDocument: input.clientDocument?.replace(/\D/g, ""),
    stand: {
      id: input.stand.id,
      code: input.stand.code,
      size: input.stand.size
    },
    contractUrl: input.contractUrl,
    pixCopyPaste: input.pixCopyPaste,
    paymentStatus: "Pagamento em aguardo",
    installments
  };
}

export function generateStandsFromBatches(batches: EventStandBatch[], eventSlug?: string): Stand[] {
  return batches.flatMap((batch, batchIndex) => {
    const quantity = Math.max(0, Math.floor(Number(batch.quantity) || 0));
    const prefix = (batch.prefix?.trim() || String.fromCharCode(65 + batchIndex)).toUpperCase();
    const batchId = batch.id?.trim() || `${prefix.toLowerCase()}-${batchIndex + 1}`;
    const padding = Math.max(2, String(quantity).length);
    const dimensions = parseStandSize(batch.size);

    return Array.from({ length: quantity }, (_, index) => {
      const code = `${prefix}-${String(index + 1).padStart(padding, "0")}`;
      const area = dimensions ? dimensions.width * dimensions.length : undefined;
      const idPrefix = eventSlug ? `${eventSlug}-` : "";

      return {
        id: `stand-${idPrefix}${prefix.toLowerCase()}-${String(index + 1).padStart(padding, "0")}`,
        eventSlug,
        code,
        size: batch.size.trim(),
        width: dimensions?.width,
        length: dimensions?.length,
        area,
        price: batch.price,
        status: "available",
        type: batch.type.trim() || "Padrão",
        batchId,
        installments: batch.installments?.map((installment) => ({ ...installment }))
      };
    });
  });
}

export function formatCurrency(value?: number): string {
  return (value ?? 0)
    .toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
    })
    .replace(/\u00a0/g, " ");
}

export function buildSignatureRecord(input: SignatureInput): SignatureRecord {
  const signedAt = input.signedAt.toISOString();

  return {
    id: `sig-${signedAt}-${input.standCode}`,
    signerName: input.signerName.trim(),
    signerDocument: input.signerDocument.trim(),
    standCode: input.standCode,
    signedAt,
    signedDate: input.signedAt.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
    signedTime: input.signedAt.toLocaleTimeString("pt-BR", { timeZone: "UTC" }),
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    signaturePath: input.signaturePath
  };
}

function parseStandSize(size: string): { width: number; length: number } | null {
  const match = size.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);

  if (!match) {
    return null;
  }

  return {
    width: Number(match[1].replace(",", ".")),
    length: Number(match[2].replace(",", "."))
  };
}
