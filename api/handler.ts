import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import { createApp } from "../dist/app.js";

let handlerPromise: Promise<any> | null = null;
async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const app = await createApp();
      return serverless(app);
    })();
  }
  return handlerPromise;
}

export default async function (req: VercelRequest, res: VercelResponse) {
  const handler = await getHandler();
  return handler(req as any, res as any);
}

