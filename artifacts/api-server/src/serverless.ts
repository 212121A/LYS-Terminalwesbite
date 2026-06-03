/**
 * Vercel Node-Serverless: Express-App direkt als Handler exportieren
 * (`(req, res) => …`). `serverless-http` nutzt standardmäßig den AWS-Event-Provider —
 * auf Vercel führt das zu FUNCTION_INVOCATION_FAILED.
 */
import app from "./app.js";

export default app;
