import { apiFetch } from "@/modules/platform/api/client";

export type AdvisorMessage = {
  role: "user" | "model";
  content: string;
};

export type AiAdvisorQuota = {
  used: number;
  limit: number;
  remaining: number;
};

export type AiAdvisorChatResponse = {
  reply: string;
  questionsUsed: number;
  questionsRemaining: number;
  dailyLimit: number;
};

export async function getAiAdvisorQuota() {
  return apiFetch<AiAdvisorQuota>("/api/ai-advisor/quota", { method: "GET" });
}

export async function sendAiAdvisorMessage(message: string, history: AdvisorMessage[]) {
  return apiFetch<AiAdvisorChatResponse>("/api/ai-advisor/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}
