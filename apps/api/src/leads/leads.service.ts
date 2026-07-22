import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  type Lead,
  type LeadInput,
  type ServiceStatus,
  validateLeadInput
} from "@expomanage/shared";
import { EXPO_REPOSITORY, type ExpoRepository } from "../repository.js";

@Injectable()
export class LeadsService {
  constructor(@Inject(EXPO_REPOSITORY) private readonly repository: ExpoRepository) {}

  list(eventSlug?: string): Promise<Lead[]> {
    return this.repository.listLeads(eventSlug);
  }

  async createInterest(input: LeadInput): Promise<Lead> {
    const errors = validateLeadInput(input);

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(" "));
    }

    const stand = await this.repository.getStandById(input.standId);

    if (!stand || stand.status === "sold") {
      throw new BadRequestException("Estande indisponível para novas solicitações.");
    }

    const now = new Date().toISOString();
    return this.repository.addLead({
      id: randomUUID(),
      eventSlug: stand.eventSlug ?? input.eventSlug,
      name: input.name,
      personType: input.personType ?? (input.documentType === "cnpj" ? "company" : "individual"),
      documentType: input.documentType,
      document: input.document,
      phone: input.phone,
      email: input.email,
      standId: stand.id,
      standCode: stand.code,
      standSize: stand.size,
      serviceStatus: "new",
      createdAt: now,
      updatedAt: now
    });
  }

  async updateServiceStatus(id: string, serviceStatus: ServiceStatus): Promise<Lead> {
    const lead = await this.repository.getLeadById(id);

    if (!lead) {
      throw new NotFoundException("Solicitação não encontrada.");
    }

    return this.repository.updateLead({
      ...lead,
      serviceStatus,
      updatedAt: new Date().toISOString()
    });
  }
}
