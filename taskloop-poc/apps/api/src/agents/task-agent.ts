import { PromptTemplate } from "@langchain/core/prompts";
import axios from "axios";
import dotenv from "dotenv";
import type { TaskAgentRequest, TaskAgentWebhookResponse, TaskDistributionPreparation } from "../types";

dotenv.config();

const distributionMessageTemplate = PromptTemplate.fromTemplate(
  [
    "TaskLoop task: {title}",
    "",
    "Instructions:",
    "{instructions}",
    "",
    "Reward: {reward} {currency}",
    "Responses needed: {required}",
    "Reply with your completed answer in one message.",
  ].join("\n"),
);

export interface TaskAgent {
  prepareDistribution(input: TaskAgentRequest): Promise<TaskDistributionPreparation>;
}

class WebhookCapableTaskAgent implements TaskAgent {
  constructor(private readonly webhookUrl?: string) {}

  async prepareDistribution(input: TaskAgentRequest): Promise<TaskDistributionPreparation> {
    if (this.webhookUrl) {
      try {
        const response = await axios.post<TaskAgentWebhookResponse>(this.webhookUrl, input, {
          timeout: 5000,
        });

        return {
          channel: "telegram",
          message: response.data.message?.trim() || (await this.buildLangChainMessage(input)),
          source: "webhook",
        };
      } catch (error) {
        console.warn("Task agent webhook unavailable, falling back to local LangChain agent.", error);
      }
    }

    return {
      channel: "telegram",
      message: await this.buildLangChainMessage(input),
      source: "langchain",
    };
  }

  private async buildLangChainMessage(input: TaskAgentRequest): Promise<string> {
    return distributionMessageTemplate.format({
      title: input.task.title,
      instructions: input.task.instructions,
      reward: input.task.reward,
      currency: input.task.currency,
      required: input.task.required,
    });
  }
}

export const taskAgent: TaskAgent = new WebhookCapableTaskAgent(process.env.TASK_AGENT_WEBHOOK_URL);
