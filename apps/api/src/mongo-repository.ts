import { Injectable, OnModuleDestroy } from "@nestjs/common";
import mongoose, { type Connection, type Model, Schema } from "mongoose";
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
import { getDatabaseUrl, getMongoConnectionOptions } from "./config.js";
import type { ExpoRepository } from "./repository.js";

type Stored<T> = T & { _id?: unknown };

const looseOptions = {
  strict: false,
  versionKey: false
} as const;

@Injectable()
export class MongoExpoRepository implements ExpoRepository, OnModuleDestroy {
  private connection: Connection | null = null;
  private eventsModel: Model<Stored<ExpoEvent>> | null = null;
  private standsModel: Model<Stored<Stand>> | null = null;
  private leadsModel: Model<Stored<Lead>> | null = null;
  private purchasesModel: Model<Stored<ClientPurchaseProfile>> | null = null;
  private paymentConfigsModel: Model<Stored<EventPaymentConfig>> | null = null;

  async onModuleDestroy() {
    await this.connection?.close();
  }

  async listEvents(): Promise<ExpoEvent[]> {
    await this.seedDefaults();
    return this.events().find().sort({ name: 1 }).lean<Stored<ExpoEvent>[]>().then(stripMongoFields);
  }

  async upsertEvent(event: ExpoEvent): Promise<ExpoEvent> {
    await this.connect();
    const now = new Date().toISOString();
    const saved = await this.events().findOneAndUpdate(
      { slug: event.slug },
      {
        $set: {
          ...event,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: event.createdAt ?? now
        }
      },
      { new: true, upsert: true }
    ).lean<Stored<ExpoEvent>>();
    return stripMongoField(saved);
  }

  async deleteEvent(eventSlug: string): Promise<boolean> {
    await this.seedDefaults();
    const eventDelete = await this.events().deleteOne({ slug: eventSlug });
    await Promise.all([
      this.stands().deleteMany(scopedEventQuery(eventSlug)),
      this.leads().deleteMany(scopedEventQuery(eventSlug)),
      this.purchases().deleteMany(scopedEventQuery(eventSlug)),
      this.paymentConfigs().deleteMany({ eventSlug })
    ]);
    return eventDelete.deletedCount > 0;
  }

  async getPaymentConfig(eventSlug: string): Promise<EventPaymentConfig> {
    await this.seedDefaults();
    const config = await this.paymentConfigs()
      .findOne({ eventSlug })
      .lean<Stored<EventPaymentConfig> | null>();

    return config ? stripMongoField(config) : defaultPaymentConfig(eventSlug);
  }

  async upsertPaymentConfig(config: EventPaymentConfig): Promise<EventPaymentConfig> {
    await this.connect();
    const saved = await this.paymentConfigs().findOneAndUpdate(
      { eventSlug: config.eventSlug },
      {
        $set: {
          ...config,
          installments: config.installments.length ? config.installments : defaultPaymentInstallments()
        }
      },
      { new: true, upsert: true }
    ).lean<Stored<EventPaymentConfig>>();
    return stripMongoField(saved);
  }

  async listStands(eventSlug = defaultExpoEvent.slug): Promise<Stand[]> {
    await this.seedDefaults();
    return this.stands()
      .find(scopedEventQuery(eventSlug))
      .sort({ code: 1 })
      .lean<Stored<Stand>[]>()
      .then(stripMongoFields);
  }

  async getStandById(id: string): Promise<Stand | undefined> {
    await this.seedDefaults();
    const stand = await this.stands().findOne({ id }).lean<Stored<Stand> | null>();
    return stand ? stripMongoField(stand) : undefined;
  }

  async updateStand(stand: Stand): Promise<Stand> {
    await this.seedDefaults();
    const updated = await this.stands().findOneAndUpdate(
      { id: stand.id },
      { $set: stand },
      { new: true, upsert: true }
    ).lean<Stored<Stand>>();
    return stripMongoField(updated);
  }

  async replaceEventStands(eventSlug: string, stands: Stand[]): Promise<Stand[]> {
    await this.seedDefaults();
    await this.stands().deleteMany(scopedEventQuery(eventSlug));

    if (stands.length === 0) {
      return [];
    }

    const scopedStands = stands.map((stand) => ({ ...stand, eventSlug }));
    await this.stands().insertMany(scopedStands);
    return scopedStands;
  }

  async listLeads(eventSlug = defaultExpoEvent.slug): Promise<Lead[]> {
    await this.seedDefaults();
    return this.leads()
      .find(scopedEventQuery(eventSlug))
      .sort({ createdAt: -1 })
      .lean<Stored<Lead>[]>()
      .then(stripMongoFields);
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    await this.seedDefaults();
    const lead = await this.leads().findOne({ id }).lean<Stored<Lead> | null>();
    return lead ? stripMongoField(lead) : undefined;
  }

  async addLead(lead: Lead): Promise<Lead> {
    await this.seedDefaults();
    const saved = await this.leads().findOneAndUpdate(
      { id: lead.id },
      { $set: lead },
      { new: true, upsert: true }
    ).lean<Stored<Lead>>();
    return stripMongoField(saved);
  }

  async updateLead(lead: Lead): Promise<Lead> {
    return this.addLead(lead);
  }

  async listPurchases(eventSlug = defaultExpoEvent.slug): Promise<ClientPurchaseProfile[]> {
    await this.connect();
    return this.purchases()
      .find(scopedEventQuery(eventSlug))
      .sort({ id: -1 })
      .lean<Stored<ClientPurchaseProfile>[]>()
      .then(stripMongoFields);
  }

  async getPurchaseById(id: string): Promise<ClientPurchaseProfile | undefined> {
    await this.connect();
    const purchase = await this.purchases().findOne({ id }).lean<Stored<ClientPurchaseProfile> | null>();
    return purchase ? stripMongoField(purchase) : undefined;
  }

  async getPurchaseByClientDocument(document: string): Promise<ClientPurchaseProfile | undefined> {
    await this.connect();
    const purchase = await this.purchases()
      .findOne({ clientDocument: document.replace(/\D/g, "") })
      .lean<Stored<ClientPurchaseProfile> | null>();
    return purchase ? stripMongoField(purchase) : undefined;
  }

  async listPurchasesByClientDocument(document: string): Promise<ClientPurchaseProfile[]> {
    await this.connect();
    return this.purchases()
      .find({ clientDocument: document.replace(/\D/g, "") })
      .sort({ id: -1 })
      .lean<Stored<ClientPurchaseProfile>[]>()
      .then(stripMongoFields);
  }

  async addPurchase(purchase: ClientPurchaseProfile): Promise<ClientPurchaseProfile> {
    await this.connect();
    const saved = await this.purchases().findOneAndUpdate(
      { id: purchase.id },
      { $set: purchase },
      { new: true, upsert: true }
    ).lean<Stored<ClientPurchaseProfile>>();
    return stripMongoField(saved);
  }

  async updatePurchase(purchase: ClientPurchaseProfile): Promise<ClientPurchaseProfile> {
    return this.addPurchase(purchase);
  }

  private async seedDefaults() {
    await this.connect();

    const [eventsCount, standsCount, leadsCount, paymentConfigsCount] = await Promise.all([
      this.events().estimatedDocumentCount(),
      this.stands().estimatedDocumentCount(),
      this.leads().estimatedDocumentCount(),
      this.paymentConfigs().estimatedDocumentCount()
    ]);

    if (eventsCount === 0) {
      await this.events().insertMany([defaultExpoEvent]);
    }

    if (standsCount === 0) {
      await this.stands().insertMany(sampleStands.map((stand) => ({ ...stand, eventSlug: defaultExpoEvent.slug })));
    }

    if (leadsCount === 0) {
      await this.leads().insertMany(sampleLeads.map((lead) => ({ ...lead, eventSlug: defaultExpoEvent.slug })));
    }

    if (paymentConfigsCount === 0) {
      await this.paymentConfigs().insertMany([defaultPaymentConfig(defaultExpoEvent.slug)]);
    }
  }

  private async connect() {
    if (this.connection) {
      return;
    }

    const databaseUrl = getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error("DATABASE_URL não configurada para MongoExpoRepository.");
    }

    this.connection = await mongoose.createConnection(databaseUrl, getMongoConnectionOptions()).asPromise();
    const entitySchema = new Schema({ id: { type: String, required: true, unique: true, index: true } }, looseOptions);
    const eventSchema = new Schema({ slug: { type: String, required: true, unique: true, index: true } }, looseOptions);
    this.eventsModel = this.connection.model<Stored<ExpoEvent>>("Event", eventSchema, "events");
    this.standsModel = this.connection.model<Stored<Stand>>("Stand", entitySchema, "stands");
    this.leadsModel = this.connection.model<Stored<Lead>>("Lead", entitySchema.clone(), "leads");
    this.purchasesModel = this.connection.model<Stored<ClientPurchaseProfile>>("Purchase", entitySchema.clone(), "purchases");
    this.paymentConfigsModel = this.connection.model<Stored<EventPaymentConfig>>(
      "PaymentConfig",
      new Schema({ eventSlug: { type: String, required: true, unique: true, index: true } }, looseOptions),
      "PaymentConfig"
    );
  }

  private stands(): Model<Stored<Stand>> {
    if (!this.standsModel) {
      throw new Error("Modelo de estandes não inicializado.");
    }

    return this.standsModel;
  }

  private events(): Model<Stored<ExpoEvent>> {
    if (!this.eventsModel) {
      throw new Error("Modelo de eventos não inicializado.");
    }

    return this.eventsModel;
  }

  private leads(): Model<Stored<Lead>> {
    if (!this.leadsModel) {
      throw new Error("Modelo de leads não inicializado.");
    }

    return this.leadsModel;
  }

  private purchases(): Model<Stored<ClientPurchaseProfile>> {
    if (!this.purchasesModel) {
      throw new Error("Modelo de compras não inicializado.");
    }

    return this.purchasesModel;
  }

  private paymentConfigs(): Model<Stored<EventPaymentConfig>> {
    if (!this.paymentConfigsModel) {
      throw new Error("Modelo de configuração de pagamento não inicializado.");
    }

    return this.paymentConfigsModel;
  }
}

function defaultPaymentConfig(eventSlug: string): EventPaymentConfig {
  return {
    eventSlug,
    pixCopyPaste: defaultPixCopyPaste,
    installments: defaultPaymentInstallments()
  };
}

function scopedEventQuery(eventSlug: string) {
  if (eventSlug === defaultExpoEvent.slug) {
    return { $or: [{ eventSlug }, { eventSlug: { $exists: false } }] };
  }

  return { eventSlug };
}

function stripMongoFields<T>(items: Stored<T>[]): T[] {
  return items.map(stripMongoField);
}

function stripMongoField<T>(item: Stored<T>): T {
  const { _id, ...value } = item;
  void _id;
  return value as T;
}
