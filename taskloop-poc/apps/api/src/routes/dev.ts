import { Router } from "express";
import { clearStore, listTasks, replaceTasks } from "../store/memory";
import { getDemoTasksSeed } from "../store/seeds";

export const devRouter = Router();

devRouter.post("/seed", (_req, res) => {
  const seededTasks = replaceTasks(getDemoTasksSeed());

  res.json({
    message: "Demo seed loaded into memory store.",
    count: seededTasks.length,
    tasks: seededTasks,
  });
});

devRouter.post("/reset", (_req, res) => {
  clearStore();

  res.json({
    message: "Memory store cleared.",
    count: listTasks().length,
  });
});
