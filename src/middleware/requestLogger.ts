import type { IncomingMessage, ServerResponse } from "node:http";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import { maskPhone } from "../utils/phone";

export function requestLogger(logger: Logger): RequestHandler {
  const middleware = pinoHttp({
    logger,
    genReqId: (req: IncomingMessage) => (req as Request).requestId,
    customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) => {
      if (res.statusCode >= 500 || error) {
        return "error";
      }
      if (res.statusCode >= 400) {
        return "warn";
      }
      return "info";
    },
    serializers: {
      req(req: IncomingMessage) {
        const expressReq = req as Request;
        return {
          id: expressReq.requestId,
          method: expressReq.method,
          url: expressReq.originalUrl || expressReq.url,
          caller: maskPhone(firstString(expressReq.body?.From) ?? firstString(expressReq.body?.Caller)),
        };
      },
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, next);
  };
}

function firstString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
