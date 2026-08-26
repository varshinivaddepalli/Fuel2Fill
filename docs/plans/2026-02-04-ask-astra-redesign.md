# Ask Astra Chat Interface Redesign

## Overview

Market-ready redesign of the Ask Astra chat interface with a modern AI assistant aesthetic (ChatGPT/Perplexity-like), using shadcn's black/white theme.

## Design Decisions

| Element | Choice |
|---------|--------|
| Overall vibe | Modern AI assistant |
| Colors | shadcn black/white theme |
| Welcome state | Minimal hero with 3 chip suggestions |
| Messages | Full-width AI responses, compact user pills |
| Sidebar | Floating drawer (no permanent sidebar) |
| Input | Minimal centered bar, expands on focus |
| Animations | Minimal, functionality first |
| Loading | Progress text showing current step |

## Layout Architecture

- No permanent sidebar - history button opens drawer
- Minimal header: history toggle, centered title, backend status
- Full-width content area for messages
- Centered input with max-width ~640px

## Welcome State

- Large greeting as hero text
- Subtle animated sparkles icon (CSS pulse)
- 3 curated suggestion chips (not 4 category tabs)
- More whitespace, spacious feel

## Message Design

- User messages: compact dark pills, right-aligned
- AI responses: full-width, no bubble, clean typography
- Results in subtle bordered cards
- Actions row for SQL toggle and navigation buttons
- Progress loading: stepper showing analysis steps

## Input Design

- Centered, max-width 640px
- Thin default state, expands on focus
- No AI icon inside
- Helper text appears on focus only

## Implementation Files

1. `chat-interface.tsx` - Layout restructure
2. `chat-welcome.tsx` - Minimal hero design
3. `chat-message.tsx` - New message styles + progress loading
4. `chat-input.tsx` - Centered, expandable input
5. `chat-history-sidebar.tsx` - Minor refinements
