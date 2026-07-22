import { Inject, Injectable } from "@nestjs/common";
import { buildDashboardStats, type DashboardStats } from "@expomanage/shared";
import { EXPO_REPOSITORY, type ExpoRepository } from "../repository.js";

@Injectable()
export class DashboardService {
  constructor(@Inject(EXPO_REPOSITORY) private readonly repository: ExpoRepository) {}

  async stats(eventSlug?: string): Promise<DashboardStats> {
    const [stands, leads] = await Promise.all([
      this.repository.listStands(eventSlug),
      this.repository.listLeads(eventSlug)
    ]);
    return buildDashboardStats(stands, leads);
  }
}
