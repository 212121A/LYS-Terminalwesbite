import { Router, type IRouter } from "express";
import stripeRouter from "./stripe.js";
import counterOrderRouter from "./counterOrder.js";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/orders", counterOrderRouter);
router.use("/stripe", stripeRouter);

export default router;
