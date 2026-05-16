import type { Task, TaskDistributionPreparation, TaskDistributionReceipt } from "../types";
import { createEntityId } from "../store/memory";

export interface TelegramService {
  sendTask(task: Task, preparation: TaskDistributionPreparation): Promise<TaskDistributionReceipt>;
}

class MockTelegramService implements TelegramService {
  async sendTask(task: Task, _preparation: TaskDistributionPreparation): Promise<TaskDistributionReceipt> {
    return {
      channel: "telegram",
      messageId: createEntityId("tgmsg"),
      recipientCount: task.required,
      simulated: true,
      sentAt: new Date().toISOString(),
    };
  }
}

export const telegramService: TelegramService = new MockTelegramService();
