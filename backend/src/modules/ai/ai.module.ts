import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { RepositoryModule } from "../repository/repository.module";

@Module({
  imports: [RepositoryModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
