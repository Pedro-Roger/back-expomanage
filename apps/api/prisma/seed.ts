import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { defaultEventStandBatches, generateStandsFromBatches } from "@expomanage/shared";
import { ReceitaCnpjMongoRepository } from "../src/cnpj-open-data.repository.js";
import type { ReceitaCompanyRecord } from "../src/cnpj-open-data.types.js";
import { loadEnvFiles } from "../src/config.js";

loadEnvFiles();
const prisma = new PrismaClient();

const eventSlug = "festival-do-camarao-2026";
const defaultPixCopyPaste =
  "00020126580014BR.GOV.BCB.PIX0136festival-camarao@apcc.org.br52040000530398654071500.005802BR5925APCC FESTIVAL DO CAMARAO6009FORTALEZA62070503***6304ABCD";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@expomanage.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const adminName = process.env.ADMIN_NAME ?? "Administrador";

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: hashPassword(adminPassword),
      role: "admin"
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: hashPassword(adminPassword),
      role: "admin"
    }
  });

  await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      name: "Festival do Camarao 2026",
      year: 2026
    },
    create: {
      slug: eventSlug,
      name: "Festival do Camarao 2026",
      year: 2026
    }
  });

  for (const stand of generateStandsFromBatches(defaultEventStandBatches)) {
    await prisma.stand.upsert({
      where: { code: stand.code },
      update: {
        eventSlug,
        size: stand.size,
        type: stand.type ?? "Padrao",
        price: stand.price ?? 0,
        status: stand.status,
        width: stand.width,
        length: stand.length,
        area: stand.area
      },
      create: {
        code: stand.code,
        eventSlug,
        size: stand.size,
        type: stand.type ?? "Padrao",
        price: stand.price ?? 0,
        status: stand.status,
        width: stand.width,
        length: stand.length,
        area: stand.area
      }
    });
  }

  await prisma.paymentConfig.upsert({
    where: { eventSlug },
    update: {
      pixCopyPaste: process.env.PIX_COPY_PASTE ?? defaultPixCopyPaste,
      installments: defaultInstallments()
    },
    create: {
      eventSlug,
      pixCopyPaste: process.env.PIX_COPY_PASTE ?? defaultPixCopyPaste,
      installments: defaultInstallments()
    }
  });

  await seedDevelopmentCnpjLookup();

  console.log(`Seed Prisma concluido. Admin: ${adminEmail}`);
}

function defaultInstallments() {
  return [
    { label: "1a parcela", amount: 1500, dueLabel: "Imediato" },
    { label: "2a parcela", amount: 2000, dueLabel: "Agosto/2026" }
  ];
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function seedDevelopmentCnpjLookup() {
  const repository = new ReceitaCnpjMongoRepository();
  const now = new Date().toISOString();
  const sampleCompany: ReceitaCompanyRecord = {
    cnpj: "07206816000115",
    cnpjBase: "07206816",
    legalName: "M DIAS BRANCO S.A. INDUSTRIA E COMERCIO DE ALIMENTOS",
    tradeName: "FABRICA FORTALEZA",
    status: "ATIVA",
    address: "Rodovia BR-116, S/N, KM 18, Jabuti, Eusebio/CE, CEP 61766-650",
    email: "tributos.estaduais@mdiasbranco.com.br",
    phone: "(85) 4005-5736",
    city: "Eusebio",
    state: "CE",
    zipCode: "61766-650",
    importedAt: now
  };

  try {
    await repository.upsertCompanies([sampleCompany]);
  } finally {
    await repository.close();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
