// api/index.mjs - ESM handler para Vercel
import serverless from 'serverless-http';
import app from '../dist/index.js';

const handler = serverless(app);
export default handler;

