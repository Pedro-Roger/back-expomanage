import { Injectable, OnModuleDestroy } from "@nestjs/common";
import mongoose, { type Connection } from "mongoose";
import { getDatabaseUrl, getMongoConnectionOptions } from "../config.js";

export const ADMIN_USER_REPOSITORY = Symbol("ADMIN_USER_REPOSITORY");

export interface AdminUserRecord {
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | string;
}

export interface AdminUsersRepository {
  findByEmail(email: string): Promise<AdminUserRecord | null>;
}

@Injectable()
export class EmptyAdminUsersRepository implements AdminUsersRepository {
  async findByEmail(): Promise<AdminUserRecord | null> {
    return null;
  }
}

@Injectable()
export class MongoAdminUsersRepository implements AdminUsersRepository, OnModuleDestroy {
  private connection: Connection | null = null;

  async onModuleDestroy() {
    await this.connection?.close();
  }

  async findByEmail(email: string): Promise<AdminUserRecord | null> {
    await this.connect();
    const normalizedEmail = email.trim().toLowerCase();
    const user =
      await this.connection!.collection<AdminUserRecord>("AdminUser").findOne({ email: normalizedEmail }) ??
      await this.connection!.collection<AdminUserRecord>("admin_users").findOne({ email: normalizedEmail });

    return user
      ? {
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role
        }
      : null;
  }

  private async connect() {
    if (this.connection) {
      return;
    }

    const databaseUrl = getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error("DATABASE_URL não configurada para MongoAdminUsersRepository.");
    }

    this.connection = await mongoose.createConnection(databaseUrl, getMongoConnectionOptions()).asPromise();
  }
}
