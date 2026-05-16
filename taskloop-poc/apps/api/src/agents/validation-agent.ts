import axios from "axios";
import dotenv from "dotenv";
import type {
  Submission,
  Task,
  ValidationRequest,
  ValidationResult,
  ValidationWebhookResponse,
} from "../types";

dotenv.config();

export interface ValidationAgent {
  validate(input: ValidationRequest): Promise<ValidationResult>;
}

class WebhookCapableValidationAgent implements ValidationAgent {
  constructor(private readonly webhookUrl?: string) {}

  async validate(input: ValidationRequest): Promise<ValidationResult> {
    if (this.webhookUrl) {
      try {
        const response = await axios.post<ValidationWebhookResponse>(this.webhookUrl, input, {
          timeout: 5000,
        });

        return {
          approved: Boolean(response.data.approved),
          score: response.data.score ?? 0,
          reason: response.data.reason?.trim() || "Validation processed by external webhook.",
          source: "webhook",
        };
      } catch (error) {
        console.warn("Validation agent webhook unavailable, falling back to mock validator.", error);
      }
    }

    return this.mockValidation(input.task, input.submission);
  }

  private mockValidation(task: Task, submission: Submission): ValidationResult {
    const normalizedResponse = submission.response.trim();
    const lowerResponse = normalizedResponse.toLowerCase();
    const hasUsefulLength = normalizedResponse.length >= 12;
    const containsUncertainLanguage = ["idk", "não sei", "nao sei", "maybe"].some((term) =>
      lowerResponse.includes(term),
    );
    const approved = hasUsefulLength && !containsUncertainLanguage;
    const scoreBase = Math.min(normalizedResponse.length / 80, 1);
    const score = Number((approved ? 0.6 + scoreBase * 0.4 : 0.2 + scoreBase * 0.2).toFixed(2));

    return {
      approved,
      score,
      reason: approved
        ? `Mock validation approved the response for task \"${task.title}\".`
        : "Mock validation rejected the response because it is too short or uncertain.",
      source: "mock",
    };
  }
}

export const validationAgent: ValidationAgent = new WebhookCapableValidationAgent(
  process.env.VALIDATION_AGENT_WEBHOOK_URL,
);
