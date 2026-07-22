import { AuthService } from "./auth/auth.service.js";
import { EmptyAdminUsersRepository } from "./auth/admin-users.repository.js";
import { DashboardService } from "./dashboard/dashboard.service.js";
import { LeadsService } from "./leads/leads.service.js";
import { InMemoryExpoRepository } from "./repository.js";
import { StandsService } from "./stands/stands.service.js";
import { JwtService } from "@nestjs/jwt";
import { getJwtSecret, loadEnvFiles } from "./config.js";

export class ExpoManageApi {
  readonly auth: AuthService;
  readonly dashboard: DashboardService;
  readonly leads: LeadsService;
  readonly stands: StandsService;

  constructor() {
    loadEnvFiles();
    const repository = new InMemoryExpoRepository();
    this.auth = new AuthService(new JwtService({ secret: getJwtSecret() }), new EmptyAdminUsersRepository());
    this.stands = new StandsService(repository);
    this.leads = new LeadsService(repository);
    this.dashboard = new DashboardService(repository);
  }
}
