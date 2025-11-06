import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:3001",
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(
    `🚀 DevInsight Agent API is running on: http://localhost:${port}`
  );
}

bootstrap();
