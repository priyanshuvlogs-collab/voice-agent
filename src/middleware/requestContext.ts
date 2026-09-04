import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.trim() ? incoming.trim() : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};
