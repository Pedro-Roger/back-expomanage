import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { type StandFilters, type StandStatus } from "@expomanage/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseStandStatus, parseStandStatusQuery } from "../validation.js";
import { StandsService } from "./stands.service.js";

@Controller("stands")
export class StandsController {
  constructor(@Inject(StandsService) private readonly stands: StandsService) {}

  @Get()
  list(@Query() query: StandFilters) {
    return this.stands.listPublic({ ...query, status: parseStandStatusQuery(query.status) });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.stands.getRequiredById(id);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param("id") id: string, @Body("status") status: StandStatus) {
    return this.stands.updateStatus(id, parseStandStatus(status));
  }

  @Post(":id/reserve")
  reserve(@Param("id") id: string) {
    return this.stands.reserve(id);
  }
}
