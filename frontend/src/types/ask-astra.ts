export type VisualizationType = "table" | "chart" | "card" | "text";

export type ChartType = "line" | "bar" | "pie";

export interface ChartConfig {
  type: ChartType;
  x_axis?: string;
  y_axis?: string;
  label_key?: string;
  value_key?: string;
}

export interface NavigationAction {
  label: string;
  path: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sql?: string;
  visualization?: VisualizationType;
  chartConfig?: ChartConfig;
  results?: Record<string, unknown>[];
  isLoading?: boolean;
  error?: string;
  navigationActions?: NavigationAction[];
  confidenceScore?: number;
  analyticsId?: string;
  retryCount?: number;
  queryClassification?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationGroup = {
  label: string;
  conversations: Conversation[];
};

export interface ConversationHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  query: string;
  conversation_history: ConversationHistoryMessage[];
}

export interface ChatResponse {
  response_text: string;
  visualization_hint: VisualizationType;
  chart_config?: ChartConfig;
  query_results?: Record<string, unknown>[];
  generated_sql?: string;
  error?: string;
  navigation_actions?: NavigationAction[];
  confidence_score?: number;
  analytics_id?: string;
  retry_count?: number;
  query_classification?: string;
}

export interface StreamEvent {
  event: "token" | "sql" | "result" | "metadata" | "error" | "done";
  data: string;
}

export interface SuggestedQuery {
  category: string;
  suggestions: string[];
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

export interface CardData {
  value: string;
  label: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
}

export interface ChartDataPoint {
  x: string;
  y: number;
  [key: string]: unknown;
}

export interface PieDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

export interface ChartData {
  type: ChartType;
  data: ChartDataPoint[] | PieDataPoint[];
  x_axis?: string;
  y_axis?: string;
}

export interface FeedbackRequest {
  analytics_id: string;
  feedback: "positive" | "negative";
  comment?: string;
}
