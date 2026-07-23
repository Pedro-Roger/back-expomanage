import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnvFiles } from "../src/config.js";

loadEnvFiles();
const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Administrador";

  if (!adminEmail || !adminPassword) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o seed.");
  }

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

  console.log(`Seed Prisma concluido. Admin: ${adminEmail}`);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
