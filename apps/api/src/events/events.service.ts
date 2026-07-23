import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { type EventPaymentConfig, type EventStandBatch, type ExpoEvent, type Stand } from "@expomanage/shared";
import { EXPO_REPOSITORY, type ExpoRepository } from "../repository.js";
import { StandsService } from "../stands/stands.service.js";

type EventInput = {
  name?: string;
  slug?: string;
  year?: number;
};

@Injectable()
export class EventsService {
  constructor(
    @Inject(EXPO_REPOSITORY) private readonly repository: ExpoRepository,
    @Inject(StandsService) private readonly stands: StandsService
  ) {}

  list(): Promise<ExpoEvent[]> {
    return this.repository.listEvents();
  }

  async upsert(input: EventInput): Promise<ExpoEvent> {
    const name = String(input.name ?? "").trim();

    if (!name) {
      throw new BadRequestException("Informe o nome do evento.");
    }

    const event: ExpoEvent = {
      slug: normalizeSlug(input.slug || name),
      name,
      year: Number(input.year) || extractYear(name)
    };

    return this.repository.upsertEvent(event);
  }

  async generateStands(eventSlug: string, batches: EventStandBatch[]): Promise<Stand[]> {
    return this.stands.generateForEvent(eventSlug, batches);
  }

  getPaymentConfig(eventSlug: string): Promise<EventPaymentConfig> {
    return this.repository.getPaymentConfig(eventSlug);
  }

  async upsertPaymentConfig(eventSlug: string, input: Partial<EventPaymentConfig>): Promise<EventPaymentConfig> {
    const pixCopyPaste = String(input.pixCopyPaste ?? "").trim();

    if (!pixCopyPaste) {
      throw new BadRequestException("Informe o PIX copia e cola do evento.");
    }

    return this.repository.upsertPaymentConfig({
      eventSlug,
      pixCopyPaste,
      installments: input.installments ?? []
    });
  }
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "evento";
}

function extractYear(value: string): number | undefined {
  const year = value.match(/\b(20\d{2})\b/)?.[1];
  return year ? Number(year) : undefined;
}
