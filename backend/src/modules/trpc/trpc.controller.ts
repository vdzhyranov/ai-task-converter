import { All, Controller, Next, Req, Res } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./router";
import { PrismaService } from "../prisma/prisma.service";
import { ConversationsService } from "../conversations/conversations.service";
import { TasksService } from "../tasks/tasks.service";
import { createContext } from "./context";

@Controller("api/trpc")
export class TrpcController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly tasksService: TasksService
  ) {}

  @All("*")
  async handleRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    const handler = trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: () =>
        createContext(
          this.prisma,
          this.conversationsService,
          this.tasksService
        ),
    });

    return handler(req, res, next);
  }
}
