import { Injectable } from "@nestjs/common";
import {
  defaultExpoEvent,
  defaultPaymentInstallments,
  defaultPixCopyPaste,
  sampleLeads,
  sampleStands,
  type ClientPurchaseProfile,
  type EventPaymentConfig,
  type ExpoEvent,
  type Lead,
  type Stand
} from "@expomanage/shared";

export const EXPO_REPOSITORY = Symbol("EXPO_REPOSITORY");

export interface ExpoRepository {
  listEvents(): Promise<ExpoEvent[]>;
  upsertEvent(event: ExpoEvent): Promise<ExpoEvent>;
  deleteEvent(eventSlug: string): Promise<boolean>;
  getPaymentConfig(eventSlug: string): Promise<EventPaymentConfig>;
  upsertPaymentConfig(config: EventPaymentConfig): Promise<EventPaymentConfig>;
  listStands(eventSlug?: string): Promise<Stand[]>;
  getStandById(id: string): Promise<Stand | undefined>;
  updateStand(stand: Stand): Promise<Stand>;
  replaceEventStands(eventSlug: string, stands: Stand[]): Promise<Stand[]>;
  listLeads(eventSlug?: string): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | undefined>;
  addLead(lead: Lead): Promise<Lead>;
  updateLead(lead: Lead): Promise<Lead>;
  listPurchases(eventSlug?: string): Promise<ClientPurchaseProfile[]>;
  getPurchaseById(id: string): Promise<ClientPurchaseProfile | undefined>;
  getPurchaseByClientDocument(document: string): Promise<ClientPurchaseProfile | undefined>;
  listPurchasesByClientDocument(document: string): Promise<ClientPurchaseProfile[]>;
  addPurchase(purchase: ClientPurchaseProfile): Promise<ClientPurchaseProfile>;
  updatePurchase(purchase: ClientPurchaseProfile): Promise<ClientPurchaseProfile>;
}

@Injectable()
export class InMemoryExpoRepository implements ExpoRepository {
  private events: ExpoEvent[];
  private paymentConfigs: EventPaymentConfig[];
  private stands: Stand[];
  private leads: Lead[];
  private purchases: ClientPurchaseProfile[] = [];

  constructor(seedDemoData = process.env.NODE_ENV === "test") {
    this.events = seedDemoData ? [structuredClone(defaultExpoEvent)] : [];
    this.paymentConfigs = seedDemoData ? [defaultPaymentConfig(defaultExpoEvent.slug)] : [];
    this.stands = seedDemoData
      ? structuredClone(sampleStands).map((stand) => ({ ...stand, eventSlug: defaultExpoEvent.slug }))
      : [];
    this.leads = seedDemoData
      ? structuredClone(sampleLeads).map((lead) => ({ ...lead, eventSlug: defaultExpoEvent.slug }))
      : [];
  }

  async listEvents(): Promise<ExpoEvent[]> {
    return structuredClone(this.events);
  }

  async upsertEvent(event: ExpoEvent): Promise<ExpoEvent> {
    const now = new Date().toISOString();
    const saved = {
      ...event,
      createdAt: event.createdAt ?? now,
      updatedAt: now
    };
    this.events = [saved, ...this.events.filter((current) => current.slug !== saved.slug)];
    return structuredClone(saved);
  }

  async deleteEvent(eventSlug: string): Promise<boolean> {
    const existed = this.events.some((event) => event.slug === eventSlug);
    this.events = this.events.filter((event) => event.slug !== eventSlug);
    this.paymentConfigs = this.paymentConfigs.filter((config) => config.eventSlug !== eventSlug);
    this.stands = this.stands.filter((stand) => (stand.eventSlug ?? defaultExpoEvent.slug) !== eventSlug);
    this.leads = this.leads.filter((lead) => (lead.eventSlug ?? defaultExpoEvent.slug) !== eventSlug);
    this.purchases = this.purchases.filter((purchase) => (purchase.eventSlug ?? defaultExpoEvent.slug) !== eventSlug);
    return existed;
  }

  async getPaymentConfig(eventSlug: string): Promise<EventPaymentConfig> {
    return structuredClone(this.paymentConfigs.find((config) => config.eventSlug === eventSlug) ?? defaultPaymentConfig(eventSlug));
  }

  async upsertPaymentConfig(config: EventPaymentConfig): Promise<EventPaymentConfig> {
    const saved = {
      ...config,
      installments: config.installments.length ? config.installments : defaultPaymentInstallments()
    };
    this.paymentConfigs = [saved, ...this.paymentConfigs.filter((current) => current.eventSlug !== saved.eventSlug)];
    return structuredClone(saved);
  }

  async listStands(eventSlug = defaultExpoEvent.slug): Promise<Stand[]> {
    return structuredClone(this.stands.filter((stand) => (stand.eventSlug ?? defaultExpoEvent.slug) === eventSlug));
  }

  async getStandById(id: string): Promise<Stand | undefined> {
    return structuredClone(this.stands.find((stand) => stand.id === id));
  }

  async updateStand(stand: Stand): Promise<Stand> {
    this.stands = this.stands.map((current) => (current.id === stand.id ? stand : current));
    return structuredClone(stand);
  }

  async replaceEventStands(eventSlug: string, stands: Stand[]): Promise<Stand[]> {
    const scopedStands = stands.map((stand) => ({ ...stand, eventSlug }));
    this.stands = [...this.stands.filter((stand) => (stand.eventSlug ?? defaultExpoEvent.slug) !== eventSlug), ...scopedStands];
    return structuredClone(scopedStands);
  }

  async listLeads(eventSlug = defaultExpoEvent.slug): Promise<Lead[]> {
    return structuredClone(this.leads.filter((lead) => (lead.eventSlug ?? defaultExpoEvent.slug) === eventSlug));
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    return structuredClone(this.leads.find((lead) => lead.id === id));
  }

  async addLead(lead: Lead): Promise<Lead> {
    this.leads = [lead, ...this.leads.filter((current) => current.id !== lead.id)];
    return structuredClone(lead);
  }

  async updateLead(lead: Lead): Promise<Lead> {
    this.leads = this.leads.map((current) => (current.id === lead.id ? lead : current));
    return structuredClone(lead);
  }

  async listPurchases(eventSlug = defaultExpoEvent.slug): Promise<ClientPurchaseProfile[]> {
    return structuredClone(this.purchases.filter((purchase) => (purchase.eventSlug ?? defaultExpoEvent.slug) === eventSlug));
  }

  async getPurchaseById(id: string): Promise<ClientPurchaseProfile | undefined> {
    return structuredClone(this.purchases.find((purchase) => purchase.id === id));
  }

  async getPurchaseByClientDocument(document: string): Promise<ClientPurchaseProfile | undefined> {
    const digits = document.replace(/\D/g, "");
    return structuredClone(this.purchases.find((purchase) => purchase.clientDocument?.replace(/\D/g, "") === digits));
  }

  async listPurchasesByClientDocument(document: string): Promise<ClientPurchaseProfile[]> {
    const digits = document.replace(/\D/g, "");
    return structuredClone(
      this.purchases.filter((purchase) => purchase.clientDocument?.replace(/\D/g, "") === digits)
    );
  }

  async addPurchase(purchase: ClientPurchaseProfile): Promise<ClientPurchaseProfile> {
    this.purchases = [purchase, ...this.purchases.filter((current) => current.id !== purchase.id)];
    return structuredClone(purchase);
  }

  async updatePurchase(purchase: ClientPurchaseProfile): Promise<ClientPurchaseProfile> {
    this.purchases = this.purchases.map((current) => (current.id === purchase.id ? purchase : current));
    return structuredClone(purchase);
  }
}

function defaultPaymentConfig(eventSlug: string): EventPaymentConfig {
  return {
    eventSlug,
    pixCopyPaste: defaultPixCopyPaste,
    installments: defaultPaymentInstallments()
  };
}
