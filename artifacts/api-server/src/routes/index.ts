import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resumeRouter from "./resume";
import atsRouter from "./ats";

const router: IRouter = Router();
router.use(healthRouter);
router.use(resumeRouter);
router.use(atsRouter);

export default router;
