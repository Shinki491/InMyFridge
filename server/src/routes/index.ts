import { Router } from "express";
import recipesRouter from "./recipes.routes";

const router = Router();

router.use("/api/recipes", recipesRouter);

export default router;