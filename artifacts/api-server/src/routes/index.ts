import { Router, type IRouter } from "express";
import stripeRouter from "./stripe.js";
import counterOrderRouter from "./counterOrder.js";
import availabilityRouter from "./availability.js";
import terminalPaymentRouter from "./terminalPayment.js";
import receiptRouter from "./receipt.js";
import fiscalClosingRouter from "./fiscalClosing.js";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/orders", counterOrderRouter);
router.use("/stripe", stripeRouter);
router.use("/availability", availabilityRouter);
router.use("/terminal", terminalPaymentRouter);
router.use("/receipt", receiptRouter);
router.use("/fiscal", fiscalClosingRouter);

export default router;
