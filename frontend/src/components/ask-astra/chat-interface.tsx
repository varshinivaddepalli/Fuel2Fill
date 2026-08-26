"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatWelcome } from "./chat-welcome";
import { ChatHistorySidebar } from "./chat-history-sidebar";
import { askQuestion } from "@/actions/ask-astra";
import { getInitials } from "@/lib/utils";
import { BackendStatusIndicator } from "@/components/ui/backend-status-indicator";
import type {
  ChatMessage as ChatMessageType,
  Conversation,
  ConversationHistoryMessage,
} from "@/types/ask-astra";

interface ChatInterfaceProps {
  userName: string;
}

const STORAGE_KEY = "ask-astra-conversations";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((c: Conversation) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map((m: ChatMessageType) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    // Limit stored conversations to prevent hitting localStorage quota (~5MB)
    const trimmed = conversations.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // QuotaExceededError — clear oldest conversations and retry
    try {
      const reduced = conversations.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function generateTitle(query: string): string {
  return query.length > 40 ? query.substring(0, 40) + "..." : query;
}

export function ChatInterface({ userName }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load conversations from localStorage on mount + cleanup timeouts on unmount
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    setIsInitialized(true);
    return () => timeoutIdsRef.current.forEach(clearTimeout);
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      saveConversations(conversations);
    }
  }, [conversations, isInitialized]);

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];
  const userInitials = getInitials(userName);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setIsHistoryOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setIsHistoryOpen(false);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const handleClearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  const handleSubmit = async (query: string) => {
    const now = new Date();
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();

    const userMessage: ChatMessageType = {
      id: userMessageId,
      role: "user",
      content: query,
      timestamp: now,
    };

    const assistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: now,
      isLoading: true,
    };

    // Create new conversation or update existing
    if (!activeConversationId) {
      const newConversation: Conversation = {
        id: uuidv4(),
        title: generateTitle(query),
        messages: [userMessage, assistantMessage],
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage, assistantMessage],
                updatedAt: now,
              }
            : c
        )
      );
    }

    setIsLoading(true);
    setLoadingStep("Analyzing your question...");

    try {
      // Simulate progress steps (backend processes these internally)
      timeoutIdsRef.current = [
        setTimeout(() => setLoadingStep("Generating SQL query..."), 800),
        setTimeout(() => setLoadingStep("Running query..."), 1600),
        setTimeout(() => setLoadingStep("Formatting results..."), 2400),
      ];

      // Extract last 4 messages from active conversation for follow-up context
      const currentMessages = activeConversation?.messages || [];
      const conversationHistory: ConversationHistoryMessage[] = currentMessages
        .filter((m) => !m.isLoading && m.content)
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await askQuestion(query, conversationHistory);

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId || (c.messages.some(m => m.id === assistantMessageId))) {
            return {
              ...c,
              messages: c.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: response.response_text,
                      sql: response.generated_sql,
                      visualization: response.visualization_hint,
                      chartConfig: response.chart_config,
                      results: response.query_results,
                      isLoading: false,
                      error: response.error,
                      navigationActions: response.navigation_actions,
                      confidenceScore: response.confidence_score,
                      analyticsId: response.analytics_id,
                      retryCount: response.retry_count,
                      queryClassification: response.query_classification,
                    }
                  : msg
              ),
            };
          }
          return c;
        })
      );
    } catch (error) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId || (c.messages.some(m => m.id === assistantMessageId))) {
            return {
              ...c,
              messages: c.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: "Sorry, I encountered an error processing your request.",
                      isLoading: false,
                      error: error instanceof Error ? error.message : "Unknown error",
                    }
                  : msg
              ),
            };
          }
          return c;
        })
      );
    } finally {
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-x-hidden bg-background">
      {/* History Dialog - responsive */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 gap-0 max-h-[85vh] sm:max-h-[80vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Chat History</DialogTitle>
          </DialogHeader>
          <ChatHistorySidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onClearAllConversations={handleClearAllConversations}
          />
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2"
          onClick={() => setIsHistoryOpen(true)}
        >
          <History className="h-4 w-4" />
          <span className="text-sm">History</span>
        </Button>
        <BackendStatusIndicator />
      </header>

      {/* Messages area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {messages.length === 0 ? (
          <ChatWelcome
            userName={userName}
            onSuggestionClick={handleSubmit}
          />
        ) : (
          <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-8 lg:px-12">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userInitials={userInitials}
                loadingStep={loadingStep}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
