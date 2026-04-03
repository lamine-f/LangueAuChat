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
- `server/` — Express server with raw WebSocket (ws library, NOT socket.io client-side)
- `shared/` — Shared types and Drizzle schema (`schema.ts`) used by both client and server

**Path aliases** (configured in tsconfig.json and vite.config.ts):
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

**Real-time communication**: Uses native WebSocket (`ws` library), not Socket.IO on the client. The client hook `use-socket.ts` wraps the browser WebSocket API with a custom event emitter pattern (`emit`/`on`/`off`). Server WebSocket endpoint is at `/ws`.

**Storage**: Currently uses in-memory storage (`MemStorage` class in `server/storage.ts`), implementing the `IStorage` interface. Drizzle + PostgreSQL schema is defined in `shared/schema.ts` but the DB backend is not wired up — the app runs entirely from memory. `DATABASE_URL` env var is only needed for `db:push`.

**AI validation**: Player names and submitted words are validated via Groq API (`llama3-70b-8192` model) in `server/ai-validator.ts`. Falls back to basic regex/blocklist validation if Groq is unavailable. Requires `GROQ_API_KEY` env var.

**Game flow** (all in `server/routes.ts`):
1. Host creates room (gets 4-letter code) → players join via code → host starts game
2. All players submit a word simultaneously for the current letter (no turn-based ordering)
3. Once all active players have submitted or given up, the next letter begins
4. Max 6 players per room

**Client screen flow** (state machine in `client/src/pages/game.tsx`):
`home` → `theme-selection` / `room-setup` → `lobby` → `game` → `results`

## Key Conventions

- The app is entirely in French (UI text, error messages, AI prompts, comments)
- Server always runs on port 5000
- Room codes are 4 uppercase letters
- No REST API endpoints — all game logic flows through WebSocket events
