# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Langue au Chat" is a French multiplayer word game where players compete by submitting words starting with a given letter within a chosen theme (animaux, fruits, legumes, pays). Players start with 1000 points and lose points for giving up. The game progresses through the alphabet A-Z; when all active players have submitted (or given up) for a letter, the next letter begins. Players are eliminated at 0 points. The last player standing or highest scorer at Z wins.

## Commands

- `npm run dev` — Start dev server (Express + Vite HMR on port 5000)
- `npm run build` — Build client (Vite) and server (esbuild) to `dist/`
- `npm run start` — Run production build (`node dist/index.js`)
- `npm run check` — TypeScript type checking
- `npm run db:push` — Push Drizzle schema to PostgreSQL

## Architecture

**Monorepo structure** with three top-level source directories sharing a single `package.json`:

- `client/` — React 18 SPA (Vite, wouter for routing, Tailwind CSS, shadcn/ui components)
- `server/` — Express server with WebSocket (ws library in noServer mode)
- `shared/` — Shared types, Drizzle schema, and WebSocket event contracts (`schema.ts`)

**Path aliases** (configured in tsconfig.json and vite.config.ts):
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

### Server

The server uses **dependency injection** — all services are instantiated in `server/routes.ts` and passed to handler factories. No global singletons.

- `server/services/` — Business logic layer:
  - `RoomService` — Room creation, joining, leaving, host transfer
  - `GameService` — Word submission, give-up, round advancement, scoring, builds per-player `GameState`
  - `ValidationService` — AI validation via Groq API (`llama3-70b-8192`), falls back to regex/blocklist. Requires `GROQ_API_KEY` env var
- `server/ws/ws-server.ts` — WebSocket server setup using `noServer: true` with manual HTTP upgrade on `/ws` path only (critical: avoids conflicting with Vite HMR)
- `server/ws/handlers/` — Handler factories (`room-handlers.ts`, `game-handlers.ts`, `chat-handlers.ts`) return `Map<string, MessageHandler>`, assembled in `routes.ts`
- `server/ws/broadcast.ts` — `Broadcaster` sends events to room players; `sendGameStateToRoom` builds personalized state per player
- `server/errors/game-errors.ts` — Typed error classes (`GameError`, `ValidationError`, etc.) with `userMessage` for client-safe error messages
- `server/config/constants.ts` — Scoring, room limits, alphabet constants
- `server/storage.ts` — `IStorage` interface + `MemStorage` in-memory implementation. Drizzle schema exists but DB is not wired up

### Client

Uses **Context + useReducer** for state management — no Redux, no React Query.

- `client/src/context/` — `GameContext` with `gameReducer` manages screen transitions, player identity, connection state. Actions dispatched from hooks
- `client/src/hooks/use-socket.ts` — Low-level WebSocket hook: multi-handler support (`Set<handler>` per event), auto-reconnect with exponential backoff, message queue when disconnected. `on()` returns an unsubscribe function
- `client/src/hooks/use-game-socket.ts` — High-level hook bridging socket ↔ context. Registers all server event handlers, dispatches actions to reducer. Exposes typed action creators (`createRoom`, `joinRoom`, `submitWord`, etc.)
- `client/src/pages/game.tsx` — Screen router: reads `state.screen` from context and renders the appropriate component
- `client/src/components/game/` — Game UI split into focused components (game-header, alphabet-progress, player-scores, word-submission-form, recent-words, game-chat)
- `client/src/components/room/` — Room flow components (theme-selection, room-setup)
- `client/src/components/error-boundary.tsx` — React Error Boundary wrapping the app
- `client/src/config/constants.ts` — Client-side constants (player limits, display limits)

### Shared contracts (`shared/schema.ts`)

- `ServerToClientEvents` / `ClientToServerEvents` — Typed WebSocket event interfaces used by both client and server
- `GameState` — Includes `myPlayerId` so each client knows its own identity (set by `GameService.buildGameStateForPlayer`)
- Drizzle tables: `players`, `rooms`, `gameWords`, `chatMessages`

### Game flow

1. Host creates room (gets 4-letter code) → players join via code → host starts game
2. All players submit a word simultaneously for the current letter (no turn-based ordering)
3. Once all active players have submitted or given up, the next letter begins
4. Max 6 players per room

**Client screen flow** (state machine driven by reducer):
`home` → `theme-selection` / `room-setup` → `lobby` → `game` → `results`

## Key Conventions

- The app is entirely in French (UI text, error messages, AI prompts, comments)
- Server always runs on port 5000
- Room codes are 4 uppercase letters
- No REST API endpoints — all game logic flows through WebSocket events
- WebSocket server must use `noServer: true` mode to coexist with Vite HMR on the same HTTP server
