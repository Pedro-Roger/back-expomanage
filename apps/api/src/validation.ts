import { BadRequestException } from "@nestjs/common";
import type { ServiceStatus, StandStatus } from "@expomanage/shared";

const standStatuses: StandStatus[] = ["available", "sold", "reserved"];
const serviceStatuses: ServiceStatus[] = ["new", "contacting", "finished"];

export function parseStandStatus(value: unknown): StandStatus {
  if (typeof value === "string" && standStatuses.includes(value as StandStatus)) {
    return value as StandStatus;
  }

  throw new BadRequestException("Status de estande inválido.");
}

export function parseStandStatusQuery(value: unknown): StandStatus | "all" | undefined {
  if (value == null || value === "" || value === "all") {
    return value === "all" ? "all" : undefined;
  }

  return parseStandStatus(value);
}

export function parseServiceStatus(value: unknown): ServiceStatus {
  if (typeof value === "string" && serviceStatuses.includes(value as ServiceStatus)) {
    return value as ServiceStatus;
  }

  throw new BadRequestException("Status de atendimento inválido.");
}
