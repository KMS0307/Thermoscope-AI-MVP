import { Router, type IRouter } from "express";
import healthRouter from "./health";
import thermoscopeRouter from "./thermoscope";

const router: IRouter = Router();

router.use(healthRouter);
router.use(thermoscopeRouter);

export default router;
