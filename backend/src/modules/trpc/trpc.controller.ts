import { All, Controller, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { resolveHTTPResponse } from "@trpc/server/http";
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
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace(/^\/api\/trpc\/?/, "");

    const httpResponse = await resolveHTTPResponse({
      router: appRouter,
      req: {
        method: req.method,
        headers: req.headers,
        query: new URLSearchParams(req.url.split("?")[1] || ""),
        body: req.body,
      },
      path,
      createContext: async () =>
        createContext(
          this.prisma,
          this.conversationsService,
          this.tasksService
        ),
    });

    res.status(httpResponse.status);

    for (const [key, value] of Object.entries(httpResponse.headers || {})) {
      if (value) {
        res.setHeader(key, value);
      }
    }

    return res.send(httpResponse.body);
  }
}
