import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { getJwtSecret, loadEnvFiles, shouldUseMongoRepository } from "./config.js";
import { ADMIN_USER_REPOSITORY, EmptyAdminUsersRepository, MongoAdminUsersRepository } from "./auth/admin-users.repository.js";
import { AuthController } from "./auth/auth.controller.js";
import { JwtAuthGuard } from "./auth/jwt-auth.guard.js";
import { AuthService } from "./auth/auth.service.js";
import { DashboardController } from "./dashboard/dashboard.controller.js";
import { DashboardService } from "./dashboard/dashboard.service.js";
import { EventsController } from "./events/events.controller.js";
import { EventsService } from "./events/events.service.js";
import { ContractsController } from "./contracts/contracts.controller.js";
import { CnpjController } from "./cnpj/cnpj.controller.js";
import { ContractDocumentService } from "./contracts/contracts.service.js";
import { HttpCnpjLookupClient } from "./contracts/cnpj.client.js";
import { S3ContractStorage } from "./contracts/s3-contract.storage.js";
import { LeadsController } from "./leads/leads.controller.js";
import { LeadsService } from "./leads/leads.service.js";
import { PurchasesController } from "./purchases/purchases.controller.js";
import { PurchasesService } from "./purchases/purchases.service.js";
import { MongoExpoRepository } from "./mongo-repository.js";
import { EXPO_REPOSITORY, InMemoryExpoRepository } from "./repository.js";
import { StandsController } from "./stands/stands.controller.js";
import { StandsService } from "./stands/stands.service.js";

loadEnvFiles();

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: "8h" }
    })
  ],
  controllers: [AuthController, CnpjController, ContractsController, DashboardController, EventsController, LeadsController, PurchasesController, StandsController],
  providers: [
    AuthService,
    ContractDocumentService,
    DashboardService,
    HttpCnpjLookupClient,
    EventsService,
    {
      provide: ADMIN_USER_REPOSITORY,
      useFactory: () => shouldUseMongoRepository() ? new MongoAdminUsersRepository() : new EmptyAdminUsersRepository()
    },
    {
      provide: EXPO_REPOSITORY,
      useFactory: () => shouldUseMongoRepository() ? new MongoExpoRepository() : new InMemoryExpoRepository()
    },
    JwtAuthGuard,
    LeadsService,
    PurchasesService,
    S3ContractStorage,
    StandsService
  ]
})
export class AppModule {}
