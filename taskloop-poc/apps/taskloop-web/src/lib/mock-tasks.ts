export type TaskStatus = "created" | "sent" | "submitted" | "approved" | "paid";

export const STATUS_FLOW: TaskStatus[] = ["created", "sent", "submitted", "approved", "paid"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  created: "Created",
  sent: "Sent to Telegram",
  submitted: "Submitted",
  approved: "Approved",
  paid: "Paid",
};

export type Submission = {
  id: string;
  user: string;
  handle: string;
  response: string;
  submittedAt: string;
  validation: "pending" | "approved" | "rejected";
  payout: "pending" | "processing" | "paid";
  txHash?: string;
};

export type PayoutRecord = {
  id: string;
  taskId: string;
  submissionId: string;
  amount: number;
  currency: "USDC" | "XLM" | "EUR";
  provider: string;
  status: "processing" | "paid" | "failed";
  createdAt: string;
  processedAt?: string;
  txHash?: string;
};

export type Task = {
  id: string;
  title: string;
  instructions: string;
  reward: number;
  currency: "USDC" | "XLM" | "EUR";
  required: number;
  status: TaskStatus;
  createdAt: string;
  telegramDelivered: number;
  submissions: Submission[];
  payouts: PayoutRecord[];
};

export const mockTasks: Task[] = [
  {
    id: "tl_001",
    title: "Classify product images for retail catalog",
    instructions:
      "Look at each product image and tag the primary color, category, and whether the background is clean white.",
    reward: 0.5,
    currency: "USDC",
    required: 50,
    status: "paid",
    createdAt: "2025-05-12T09:24:00Z",
    telegramDelivered: 50,
    submissions: [
      {
        id: "s1",
        user: "Maya Chen",
        handle: "@maya_c",
        response: "Color: navy. Category: footwear. Background: clean.",
        submittedAt: "2025-05-12T11:02:00Z",
        validation: "approved",
        payout: "paid",
        txHash: "a3f1...9d2c",
      },
      {
        id: "s2",
        user: "Diego Alvarez",
        handle: "@dgo",
        response: "Color: red. Category: apparel. Background: not clean.",
        submittedAt: "2025-05-12T11:14:00Z",
        validation: "approved",
        payout: "paid",
        txHash: "b7e2...4a18",
      },
    ],
    payouts: [],
  },
  {
    id: "tl_002",
    title: "Verify business addresses in Lisbon",
    instructions:
      "Open the provided Google Maps link and confirm the business name on the storefront matches the listing.",
    reward: 1.2,
    currency: "USDC",
    required: 25,
    status: "submitted",
    createdAt: "2025-05-14T16:10:00Z",
    telegramDelivered: 25,
    submissions: [
      {
        id: "s3",
        user: "Ana Ribeiro",
        handle: "@anar",
        response: "Confirmed. Sign reads exactly as listing.",
        submittedAt: "2025-05-15T08:41:00Z",
        validation: "pending",
        payout: "pending",
      },
    ],
    payouts: [],
  },
  {
    id: "tl_003",
    title: "Translate 20 short customer reviews to English",
    instructions: "Translate each review preserving tone. Flag anything you can't confidently translate.",
    reward: 2,
    currency: "USDC",
    required: 10,
    status: "sent",
    createdAt: "2025-05-15T07:55:00Z",
    telegramDelivered: 10,
    submissions: [],
    payouts: [],
  },
  {
    id: "tl_004",
    title: "Rate AI assistant responses for helpfulness",
    instructions: "Score 1–5 and give a one-line reason. Skip anything offensive.",
    reward: 0.25,
    currency: "USDC",
    required: 100,
    status: "created",
    createdAt: "2025-05-15T10:02:00Z",
    telegramDelivered: 0,
    submissions: [],
    payouts: [],
  },
];
