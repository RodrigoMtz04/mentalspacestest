// api/index.ts - resilient Vercel handler
import serverless from "serverless-http";
import app from "../server/index";

const handler = serverless(app as any);

export default handler;
