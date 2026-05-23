import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import galleriesRouter from "./galleries";
import artworksRouter from "./artworks";
import publicGalleriesRouter from "./publicGalleries";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(galleriesRouter);
router.use(artworksRouter);
router.use(publicGalleriesRouter);
router.use(dashboardRouter);

export default router;
