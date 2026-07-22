import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { type LeadInput, type ServiceStatus } from "@expomanage/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseServiceStatus } from "../validation.js";
import { LeadsService } from "./leads.service.js";

@Controller("leads")
export class LeadsController {
  constructor(@Inject(LeadsService) private readonly leads: LeadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Query("eventSlug") eventSlug?: string) {
    return this.leads.list(eventSlug);
  }

  @Post("interest")
  createInterest(@Body() input: LeadInput) {
    return this.leads.createInterest(input);
  }

  @Patch(":id/service-status")
  @UseGuards(JwtAuthGuard)
  updateServiceStatus(@Param("id") id: string, @Body("serviceStatus") serviceStatus: ServiceStatus) {
    return this.leads.updateServiceStatus(id, parseServiceStatus(serviceStatus));
  }
}
