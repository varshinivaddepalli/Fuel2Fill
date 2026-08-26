"use client";

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationGroup } from "@/types/ask-astra";

interface ChatHistorySidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAllConversations: () => void;
}

function groupConversationsByDate(conversations: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: ConversationGroup[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Previous 7 Days", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updatedAt);
    if (convDate >= today) {
      groups[0].conversations.push(conv);
    } else if (convDate >= yesterday) {
      groups[1].conversations.push(conv);
    } else if (convDate >= sevenDaysAgo) {
      groups[2].conversations.push(conv);
    } else {
      groups[3].conversations.push(conv);
    }
  });

  return groups.filter((g) => g.conversations.length > 0);
}

export function ChatHistorySidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAllConversations,
}: ChatHistorySidebarProps) {
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div className="flex flex-col h-full w-full bg-background max-h-[75vh] sm:max-h-[70vh]">
      {/* Header */}
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full gap-2" variant="default">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {groupedConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                        activeConversationId === conv.id && "bg-accent"
                      )}
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{conv.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with Clear All */}
      {conversations.length > 0 && (
        <div className="p-3 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Chats
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearAllConversations}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
