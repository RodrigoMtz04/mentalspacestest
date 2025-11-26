// api/index.mjs - ESM handler para Vercel
import serverless from 'serverless-http';
import * as mod from '../dist/index.js';
const app = (mod && (mod.default || mod.app || mod))

const handler = serverless(app);
export default handler;
