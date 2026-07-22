import { Body, Controller, Inject, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("login")
  login(@Body("email") email: string, @Body("password") password: string) {
    return this.auth.login(email, password);
  }
}
