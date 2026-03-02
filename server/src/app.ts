import express from "express";
import cors from "cors";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "inmyfridge-api" });
  });

  return app;
}