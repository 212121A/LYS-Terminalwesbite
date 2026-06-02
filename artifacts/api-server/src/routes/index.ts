import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkoutRouter from "./checkout";
import orderRouter from "./order";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkoutRouter);
router.use(orderRouter);

export default router;
