/**
 * Wie LYS Website `artifacts/api-server/src/app.ts` (Express + Stripe-Raw-Webhook + gleiche Middleware-Reihenfolge).
 * Zusätzlich: `https://lys-terminal-bestellseite.vercel.app` in CORS (Terminal-Production).
 */
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import stripeRouter from "./routes/stripe.js";
import { logger } from "./lib/logger.js";
import { isAllowedBrowserOrigin } from "./lib/allowedOrigins.js";

const app: Express = express();

/** Vercel/proxy: `X-Forwarded-For` ist gesetzt — sonst wirft express-rate-limit (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR). */
app.set("trust proxy", 1);

const webhookRouter = express.Router();
webhookRouter.use((req, _res, next) => {
  req.url = "/webhook";
  next();
});
webhookRouter.use(stripeRouter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Request) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, cb) {
      if (isAllowedBrowserOrigin(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  }),
);

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/stripe/webhook")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  webhookRouter,
);

// Kein zweites express.json() — Body wurde oben schon geparst (außer Webhook mit raw).
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
