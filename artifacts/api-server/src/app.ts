import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import logger from "./lib/logger.js";
import apiRouter from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger
  })
);

app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

export default app;
