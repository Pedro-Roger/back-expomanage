import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { type EventPaymentConfig, type EventStandBatch } from "@expomanage/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { EventsService } from "./events.service.js";

@Controller("events")
export class EventsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.events.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  upsert(@Body() input: { name?: string; slug?: string; year?: number }) {
    return this.events.upsert(input);
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard)
  delete(@Param("slug") slug: string) {
    return this.events.delete(slug);
  }

  @Post(":slug/stands/generate")
  @UseGuards(JwtAuthGuard)
  generateStands(@Param("slug") slug: string, @Body("batches") batches: EventStandBatch[] = []) {
    return this.events.generateStands(slug, batches);
  }

  @Get(":slug/payment-config")
  @UseGuards(JwtAuthGuard)
  getPaymentConfig(@Param("slug") slug: string) {
    return this.events.getPaymentConfig(slug);
  }

  @Post(":slug/payment-config")
  @UseGuards(JwtAuthGuard)
  upsertPaymentConfig(@Param("slug") slug: string, @Body() input: Partial<EventPaymentConfig>) {
    return this.events.upsertPaymentConfig(slug, input);
  }
}
