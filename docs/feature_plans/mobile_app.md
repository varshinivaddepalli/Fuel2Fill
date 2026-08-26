# Mobile App - React Native + Expo

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 53+ (React Native) |
| **State Management** | TanStack Query + Zustand |
| **Navigation** | Expo Router (file-based, like Next.js App Router) |
| **Auth** | `@supabase/supabase-js` (same library as web) |
| **Database** | `@supabase/supabase-js` (same Supabase instance) |
| **AI Chat** | EventSource polyfill for SSE -> existing FastAPI endpoint |
| **Styling** | NativeWind v5 (Tailwind CSS for React Native) |
| **Camera** | `expo-camera` + `expo-image-picker` |
| **Offline** | WatermelonDB or expo-sqlite |
| **Build/Deploy** | EAS Build + EAS Submit (Expo's cloud CI/CD) |
| **Testing** | Jest + React Native Testing Library |

---

## Target Users

- **Station Owners (Clients)**: Lighter management view, dashboards, AI chatbot queries on-the-go
- **On-ground Employees (Managers/Pump Boys)**: Daily operations - recording sales, marking attendance, logging meter readings, shift check-in

---

## MVP Features (Phase 1)

### Daily Operations
- Daily Sale Records (meter readings, payment breakdowns per nozzle)
- Daily Fuel Price updates
- Attendance marking (bulk mark, individual)
- Shift management (view current/past shifts, check-in)

### Ask Astra (AI Chatbot)
- Natural language queries via SSE streaming
- Same FastAPI backend endpoint (`/api/v1/chat`)
- Chat history stored locally
- Visualization support (text, card, table, chart)

---

## Backend Integration

- **Same Supabase database** - one source of truth for web and mobile
- **Same FastAPI backend** - Ask Astra, Click Astra endpoints shared
- **Same auth system** - Supabase Auth with `@supabase/supabase-js`
- **Same RLS policies** - security enforced at database level

---

## Advantages

- **Massive code reuse** - TypeScript types (`database.ts`), validation (`indian-formats.ts`), utility functions, and TanStack Query patterns can be shared directly from the web app via a monorepo
- **NativeWind** = same Tailwind classes already used in the web app
- **Expo Router** mirrors Next.js App Router (file-based routing) - familiar mental model
- **Over-the-air updates (OTA)** via EAS Update - push hotfixes without app store review
- **Same Supabase client library** (`@supabase/supabase-js`) - zero learning curve for backend integration
- Same React + TypeScript ecosystem as the web frontend

---

## Trade-offs

- Higher memory/CPU usage than Flutter (matters for low-end Android phones common in India)
- NativeWind v5 is still in preview - potential stability issues
- React Native's bridge (even with New Architecture) adds overhead for rapid form input
- Camera/OCR integration slightly less polished than Flutter
- Offline-first is harder to implement well compared to Flutter

---

## Monorepo Structure (Proposed)

```
petro_astra_v1/
├── frontend/              # Existing Next.js web app
├── mobile/                # New Expo React Native app
│   ├── app/               # Expo Router file-based routes
│   ├── components/        # Mobile-specific components
│   ├── hooks/             # Mobile hooks (can import shared)
│   └── ...
├── packages/
│   └── shared/            # Shared code between web and mobile
│       ├── types/         # database.ts, ask-astra.ts
│       ├── validation/    # indian-formats.ts
│       └── utils/         # formatCurrency, date helpers, etc.
├── backend/               # Existing FastAPI backend
└── ...
```

---

## Key Dependencies

```json
{
  "expo": "~53.x",
  "expo-router": "~4.x",
  "react-native": "0.76+",
  "nativewind": "^5.0",
  "tailwindcss": "^4.0",
  "@supabase/supabase-js": "^2.x",
  "@tanstack/react-query": "^5.x",
  "zustand": "^5.x",
  "expo-camera": "~16.x",
  "expo-image-picker": "~16.x",
  "react-native-reanimated": "~3.x",
  "react-native-gesture-handler": "~2.x"
}
```

---

## References

- [Expo Docs - Using Supabase](https://docs.expo.dev/guides/using-supabase/)
- [Supabase + Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [NativeWind v5](https://www.nativewind.dev/v5)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [Expo + Next.js Monorepo](https://expo.dev/blog/from-a-brownfield-react-native-and-next-js-stack-to-one-expo-app)
