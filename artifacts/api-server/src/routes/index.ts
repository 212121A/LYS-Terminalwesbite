import { Router, type IRouter } from "express";
import stripeRouter from "./stripe.js";
import counterOrderRouter from "./counterOrder.js";
import availabilityRouter from "./availability.js";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/orders", counterOrderRouter);
router.use("/stripe", stripeRouter);
router.use("/availability", availabilityRouter);

export default router;
