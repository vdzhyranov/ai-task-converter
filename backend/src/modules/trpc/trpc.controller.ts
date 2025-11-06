import { All, Controller, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { appRouter } from './router';
import { PrismaService } from '../prisma/prisma.service';
import { createContext } from './context';

@Controller('api/trpc')
export class TrpcController {
  constructor(private readonly prisma: PrismaService) {}

  @All('*')
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    const handler = createHTTPHandler({
      router: appRouter,
      createContext: () => createContext(this.prisma),
    });

    // Convert NestJS request/response to Node.js request/response
    return handler(req, res);
  }
}