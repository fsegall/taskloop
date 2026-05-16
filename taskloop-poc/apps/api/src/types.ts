export type TaskStatus = "created" | "sent" | "submitted" | "approved" | "paid";

export type Currency = "USDC" | "XLM" | "EUR";
export type SubmissionValidationStatus = "pending" | "approved" | "rejected";
export type SubmissionPayoutStatus = "pending" | "processing" | "paid";
export type PayoutStatus = "processing" | "paid" | "failed";
export type AgentSource = "mock" | "webhook" | "langchain";

export interface ValidationResult {
  approved: boolean;
  score: number;
  reason: string;
  source: AgentSource;
}

export interface TaskDistributionPreparation {
  channel: "telegram";
  message: string;
  source: AgentSource;
}

export interface TaskDistributionReceipt {
  channel: "telegram";
  messageId: string;
  recipientCount: number;
  simulated: boolean;
  sentAt: string;
}

export interface Submission {
  id: string;
  user: string;
  handle?: string | undefined;
  walletAddress?: string | undefined;
  response: string;
  submittedAt: string;
  validation: SubmissionValidationStatus;
  validationScore?: number | undefined;
  validationReason?: string | undefined;
  payout: SubmissionPayoutStatus;
  payoutId?: string | undefined;
  txHash?: string | undefined;
}

export interface Payout {
  id: string;
  taskId: string;
  submissionId: string;
  amount: number;
  currency: Currency;
  provider: string;
  status: PayoutStatus;
  createdAt: string;
  processedAt?: string | undefined;
  txHash?: string | undefined;
}

export interface Task {
  id: string;
  title: string;
  instructions: string;
  reward: number;
  currency: Currency;
  required: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  telegramDelivered: number;
  distribution?: (TaskDistributionPreparation & TaskDistributionReceipt) | undefined;
  submissions: Submission[];
  payouts: Payout[];
}

export interface CreateTaskInput {
  title: string;
  instructions: string;
  reward: number;
  currency?: Currency | undefined;
  required?: number | undefined;
}

export interface SubmitTaskInput {
  user: string;
  handle?: string | undefined;
  walletAddress?: string | undefined;
  response: string;
}

export interface ApproveTaskInput {
  submissionId?: string | undefined;
  simulatePayoutFailure?: boolean | undefined;
}

export interface PayoutTaskInput {
  submissionId?: string | undefined;
}

export interface StellarPayoutRequest {
  amount: number;
  currency: Currency;
  destination?: string | undefined;
  memo: string;
}

export interface PayoutExecutionResult {
  provider: string;
  status: PayoutStatus;
  txHash?: string | undefined;
  processedAt: string;
}

export interface ValidationRequest {
  task: Task;
  submission: Submission;
}

export interface TaskAgentRequest {
  task: Task;
}

export interface ValidationWebhookResponse {
  approved?: boolean | undefined;
  score?: number | undefined;
  reason?: string | undefined;
}

export interface TaskAgentWebhookResponse {
  message?: string | undefined;
}

export interface ApiErrorBody {
  error: string;
}
