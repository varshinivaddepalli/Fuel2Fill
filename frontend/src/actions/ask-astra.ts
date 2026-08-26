"use server";

/**
 * Ask Astra Server Actions
 *
 * NOTE: Unlike other server actions that use Supabase client directly,
 * Ask Astra communicates with a separate FastAPI backend for AI/LLM processing.
 * This is because the LangGraph agent and Groq LLM integration runs in Python.
 * The Supabase JWT token is passed to authenticate with the FastAPI backend.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ChatResponse,
  SuggestedQuery,
  ConversationHistoryMessage,
} from "@/types/ask-astra";

const API_URL = process.env.ASK_ASTRA_INTERNAL_URL || process.env.NEXT_PUBLIC_ASK_ASTRA_API_URL || "http://localhost:8000";

async function getAuthToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function askQuestion(
  query: string,
  conversationHistory: ConversationHistoryMessage[] = []
): Promise<ChatResponse> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/v1/chat/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function submitFeedback(
  analyticsId: string,
  feedback: "positive" | "negative",
  comment?: string
): Promise<{ status: string }> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/v1/chat/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      analytics_id: analyticsId,
      feedback,
      comment,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function getSuggestedQueries(): Promise<{ queries: SuggestedQuery[] }> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/v1/chat/suggested-queries`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Return default suggestions if endpoint fails
    return {
      queries: [
        {
          category: "Overview",
          suggestions: [
            "How many stations do I have?",
            "Show me all my employees",
            "What is my total tank capacity?",
          ],
        },
        {
          category: "Employees",
          suggestions: [
            "How many employees do I have?",
            "Show attendance for this week",
            "Which employees are on shift today?",
          ],
        },
        {
          category: "Fuel Prices",
          suggestions: [
            "What are the current fuel prices?",
            "Show diesel price trend this month",
            "Compare fuel prices across stations",
          ],
        },
      ],
    };
  }

  return response.json();
}

export async function getStreamUrl(query: string): Promise<{ url: string; token: string }> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  return {
    url: `${API_URL}/api/v1/chat/ask/stream`,
    token,
  };
}
