import { Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { timingSafeEqual, scryptSync } from "node:crypto";
import { getAdminEmail, getAdminName, getAdminPassword } from "../config.js";
import { ADMIN_USER_REPOSITORY, type AdminUsersRepository } from "./admin-users.repository.js";

export interface AuthSession {
  token: string;
  user: {
    name: string;
    email: string;
    role: "admin";
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Optional() @Inject(ADMIN_USER_REPOSITORY) private readonly adminUsers?: AdminUsersRepository
  ) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const adminFromDatabase = await this.adminUsers?.findByEmail(normalizedEmail);

    if (adminFromDatabase) {
      if (!verifyPassword(password, adminFromDatabase.passwordHash)) {
        throw new UnauthorizedException("Credenciais inválidas.");
      }

      return this.createSession({
        email: adminFromDatabase.email,
        name: adminFromDatabase.name
      });
    }

    const adminEmail = getAdminEmail().toLowerCase();

    if (normalizedEmail !== adminEmail || password !== getAdminPassword()) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    return this.createSession({
      email: adminEmail,
      name: getAdminName()
    });
  }

  private createSession(user: { email: string; name: string }): AuthSession {
    return {
      token: this.jwt.sign({ sub: user.email, role: "admin" }),
      user: {
        name: user.name,
        email: user.email,
        role: "admin"
      }
    };
  }
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [algorithm, salt, expectedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"));
  const expected = Buffer.from(expectedHash);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
