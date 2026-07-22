import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  filterStands,
  generateStandsFromBatches,
  type EventStandBatch,
  type Stand,
  type StandFilters,
  type StandStatus
} from "@expomanage/shared";
import { EXPO_REPOSITORY, type ExpoRepository } from "../repository.js";

@Injectable()
export class StandsService {
  constructor(@Inject(EXPO_REPOSITORY) private readonly repository: ExpoRepository) {}

  async listPublic(filters: StandFilters = {}): Promise<Stand[]> {
    return filterStands(await this.repository.listStands(filters.eventSlug), filters);
  }

  getById(id: string): Promise<Stand | undefined> {
    return this.repository.getStandById(id);
  }

  async getRequiredById(id: string): Promise<Stand> {
    const stand = await this.repository.getStandById(id);

    if (!stand) {
      throw new NotFoundException("Estande não encontrado.");
    }

    return stand;
  }

  async updateStatus(id: string, status: StandStatus): Promise<Stand> {
    const stand = await this.repository.getStandById(id);

    if (!stand) {
      throw new NotFoundException("Estande não encontrado.");
    }

    return this.repository.updateStand({ ...stand, status });
  }

  async reserve(id: string): Promise<Stand> {
    const stand = await this.repository.getStandById(id);

    if (!stand) {
      throw new NotFoundException("Estande não encontrado.");
    }

    if (stand.status !== "available") {
      throw new BadRequestException("Estande indisponível para reserva.");
    }

    return this.repository.updateStand({
      ...stand,
      status: "reserved",
      exhibitor: stand.exhibitor ?? "Reserva em andamento"
    });
  }

  async generateForEvent(eventSlug: string, batches: EventStandBatch[]): Promise<Stand[]> {
    const slug = eventSlug.trim();

    if (!slug) {
      throw new BadRequestException("Informe o evento para gerar estandes.");
    }

    const stands = generateStandsFromBatches(batches, slug);

    if (stands.length === 0) {
      throw new BadRequestException("Informe pelo menos um lote com quantidade maior que zero.");
    }

    return this.repository.replaceEventStands(slug, stands);
  }
}
