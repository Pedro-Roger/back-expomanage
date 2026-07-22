import mongoose, { type Connection, type Model, Schema } from "mongoose";
import { getDatabaseUrl, getMongoConnectionOptions } from "./config.js";
import type { ReceitaCompanyRecord } from "./cnpj-open-data.types.js";

type StoredReceitaCompany = ReceitaCompanyRecord & { _id?: unknown };

export class ReceitaCnpjMongoRepository {
  private connection: Connection | null = null;
  private companyModel: Model<StoredReceitaCompany> | null = null;

  async upsertCompanies(companies: ReceitaCompanyRecord[]): Promise<number> {
    if (companies.length === 0) {
      return 0;
    }

    await this.connect();
    const result = await this.companies().bulkWrite(
      companies.map((company) => ({
        updateOne: {
          filter: { cnpj: company.cnpj },
          update: { $set: company },
          upsert: true
        }
      })),
      { ordered: false }
    );

    return result.modifiedCount + result.upsertedCount;
  }

  async findByCnpj(cnpj: string): Promise<ReceitaCompanyRecord | undefined> {
    await this.connect();
    const company = await this.companies().findOne({ cnpj: onlyDigits(cnpj) }).lean<StoredReceitaCompany | null>();

    if (!company) {
      return undefined;
    }

    const { _id, ...value } = company;
    void _id;
    return value;
  }

  async close(): Promise<void> {
    await this.connection?.close();
    this.connection = null;
    this.companyModel = null;
  }

  private async connect() {
    if (this.connection) {
      return;
    }

    const databaseUrl = getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error("DATABASE_URL precisa estar configurada para importar/consultar CNPJ.");
    }

    this.connection = await mongoose.createConnection(databaseUrl, getMongoConnectionOptions()).asPromise();
    const companySchema = new Schema(
      {
        cnpj: { type: String, required: true, unique: true, index: true },
        cnpjBase: { type: String, required: true, index: true },
        legalName: { type: String, required: true, index: true }
      },
      { strict: false, versionKey: false }
    );
    this.companyModel = this.connection.model<StoredReceitaCompany>("ReceitaCnpjCompany", companySchema, "cnpj_companies");
  }

  private companies(): Model<StoredReceitaCompany> {
    if (!this.companyModel) {
      throw new Error("Modelo de CNPJ não inicializado.");
    }

    return this.companyModel;
  }
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
