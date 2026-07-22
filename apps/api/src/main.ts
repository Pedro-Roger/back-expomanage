import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { getApiPort, loadEnvFiles } from "./config.js";

loadEnvFiles();
const port = getApiPort();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(port);
  console.log(`ExpoManage API ready on http://localhost:${port}`);
}

void bootstrap();
