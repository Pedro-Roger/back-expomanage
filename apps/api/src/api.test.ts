import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { AppModule } from "./app.module.js";
import { ExpoManageApi } from "./app.js";
import { AuthService } from "./auth/auth.service.js";
import { getApiPort, getJwtSecret, loadEnvFiles, shouldUseMongoRepository } from "./config.js";
import { LeadsController } from "./leads/leads.controller.js";
import { StandsController } from "./stands/stands.controller.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("ExpoManage API domain", () => {
  it("loads API environment files and keeps shell variables first", () => {
    const envDir = mkdtempSync(join(tmpdir(), "expomanage-env-"));
    const rootEnv = join(envDir, ".env");
    const apiEnv = join(envDir, "apps-api.env");
    writeFileSync(rootEnv, "PORT=3001\nJWT_SECRET=root-secret\n");
    writeFileSync(apiEnv, "PORT=3333\nJWT_SECRET=api-secret\n");
    delete process.env.PORT;
    delete process.env.JWT_SECRET;

    loadEnvFiles([rootEnv, apiEnv]);

    expect(getApiPort()).toBe(3333);
    expect(getJwtSecret()).toBe("api-secret");
    expect(process.env.JWT_SECRET).toBe("api-secret");

    process.env.PORT = "4444";
    loadEnvFiles([rootEnv, apiEnv]);

    expect(getApiPort()).toBe(4444);
    rmSync(envDir, { recursive: true, force: true });
  });

  it("lists stands using public filters", async () => {
    const api = new ExpoManageApi();

    const result = await api.stands.listPublic({ status: "available", size: "9m²" });

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("F-07");
  });

  it("blocks lead creation for sold stands", async () => {
    const api = new ExpoManageApi();

    await expect(
      api.leads.createInterest({
        name: "Pedro Roger",
        personType: "individual",
        documentType: "cpf",
        document: "12345678901",
        phone: "(85) 99999-9999",
        email: "pedro@example.com",
        standId: "stand-a-04"
      })
    ).rejects.toThrow("Estande indisponível para novas solicitações.");
  });

  it("creates a new lead for an available stand without selling it", async () => {
    const api = new ExpoManageApi();

    const lead = await api.leads.createInterest({
      name: "Pedro Roger",
      personType: "individual",
      documentType: "cpf",
      document: "12345678901",
      phone: "(85) 99999-9999",
      email: "pedro@example.com",
      standId: "stand-c-02"
    });

    expect(lead.serviceStatus).toBe("new");
    expect(lead.standCode).toBe("C-02");
    expect((await api.stands.getById("stand-c-02"))?.status).toBe("available");
  });

  it("creates a new lead for a reserved stand", async () => {
    const api = new ExpoManageApi();
    await api.stands.reserve("stand-c-02");

    const lead = await api.leads.createInterest({
      name: "Maria Silva",
      personType: "individual",
      documentType: "cpf",
      document: "12345678901",
      phone: "(85) 99999-1111",
      email: "maria@example.com",
      standId: "stand-c-02"
    });

    expect(lead.name).toBe("Maria Silva");
    expect(lead.standCode).toBe("C-02");
  });

  it("updates lead service status", async () => {
    const api = new ExpoManageApi();

    const updated = await api.leads.updateServiceStatus("lead-001", "finished");

    expect(updated.serviceStatus).toBe("finished");
  });

  it("returns dashboard totals", async () => {
    const api = new ExpoManageApi();

    await expect(api.dashboard.stats()).resolves.toMatchObject({
      totalStands: 6,
      availableStands: 3,
      soldStands: 2,
      totalLeads: 3,
      newLeads: 2
    });
  });

  it("wires real Nest providers and controllers", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    await expect(moduleRef.get(StandsController).list({ status: "available" })).resolves.toHaveLength(3);
    await expect(moduleRef.get(AuthService).login("admin@expomanage.local", "admin123")).resolves.toMatchObject({
      token: expect.stringMatching(/^ey/)
    });
  });

  it("authenticates the admin configured by environment", async () => {
    process.env.ADMIN_EMAIL = "dono@example.com";
    process.env.ADMIN_PASSWORD = "senha-forte";
    process.env.ADMIN_NAME = "Dono do Evento";
    const api = new ExpoManageApi();

    const session = await api.auth.login("dono@example.com", "senha-forte");

    expect(session.user).toMatchObject({
      name: "Dono do Evento",
      email: "dono@example.com",
      role: "admin"
    });
    await expect(api.auth.login("admin@expomanage.local", "admin123")).rejects.toThrow(UnauthorizedException);
  });

  it("authenticates the admin stored in Mongo before using environment fallback", async () => {
    process.env.ADMIN_EMAIL = "env@example.com";
    process.env.ADMIN_PASSWORD = "env-password";
    const auth = new AuthService(new JwtService({ secret: getJwtSecret() }), {
      async findByEmail(email: string) {
        return email === "admin@banco.local"
          ? {
              email: "admin@banco.local",
              name: "Admin do Banco",
              passwordHash: hashTestPassword("senha-do-banco"),
              role: "admin"
            }
          : null;
      }
    });

    const session = await auth.login("admin@banco.local", "senha-do-banco");

    expect(session.user).toMatchObject({
      email: "admin@banco.local",
      name: "Admin do Banco",
      role: "admin"
    });
    await expect(auth.login("env@example.com", "senha-do-banco")).rejects.toThrow(UnauthorizedException);
  });

  it("maps expected API failures to Nest HTTP exceptions", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    await expect(moduleRef.get(AuthService).login("x@example.com", "bad")).rejects.toThrow(UnauthorizedException);
    expect(() => moduleRef.get(StandsController).updateStatus("stand-c-02", "invalid" as never)).toThrow(BadRequestException);
    await expect(moduleRef.get(LeadsController).createInterest({ standId: "stand-c-02" } as never)).rejects.toThrow(BadRequestException);
  });

  it("selects mongo repository when explicitly configured", () => {
    process.env.EXPO_REPOSITORY = "mongo";

    expect(shouldUseMongoRepository()).toBe(true);
  });

  it("boots the Nest HTTP app and protects admin routes", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get("/dashboard").expect(401);

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@expomanage.local", password: "admin123" })
      .expect(201);

    await request(app.getHttpServer())
      .get("/dashboard")
      .set("Authorization", `Bearer ${login.body.token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalStands).toBe(6);
      });

    await request(app.getHttpServer()).get("/stands/not-found").expect(404);
    await request(app.getHttpServer()).get("/stands?status=invalid").expect(400);

    await app.close();
  });

  it("reserves an available stand through the public HTTP flow", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post("/stands/stand-c-02/reserve")
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: "stand-c-02",
          code: "C-02",
          status: "reserved",
          exhibitor: "Reserva em andamento"
        });
      });

    await request(app.getHttpServer())
      .post("/stands/stand-c-02/reserve")
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe("Estande indisponível para reserva.");
      });

    await app.close();
  });
});

function hashTestPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
