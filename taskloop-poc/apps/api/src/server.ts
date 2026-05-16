import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { devRouter } from "./routes/dev";
import { tasksRouter } from "./routes/tasks";
import { x402Router } from "./routes/x402";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    project: "TaskLoop API",
    status: "running",
    docs: {
      health: "/health",
      tasks: "/tasks",
      x402DistributionUnlock: "/x402/distribution/unlock",
      devSeed: "/dev/seed",
      devReset: "/dev/reset",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "taskloop-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/tasks", tasksRouter);
app.use("/x402", x402Router);
app.use("/dev", devRouter);

app.listen(port, () => {
  console.log(`TaskLoop API running on port ${port}`);
});