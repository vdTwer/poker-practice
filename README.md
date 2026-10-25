# Poker Practice

A place to learn No-Limit Texas Hold'em from zero, with interactive drills and explanations that always show the
reasoning. Built in slices following the plan in "Hold'em Learning Path". This is **slice 1: the game engine and table**.

## Run it

```sh
docker compose up -d
```

Then open http://localhost:8080. The first start builds the image (about a minute); the build also runs the engine
tests, so a broken rule never ships. To use another port: `PORT=3000 docker compose up -d`.

## What's in slice 1

- **Rules engine** (`packages/engine`): No-Limit Hold'em for 2 to 9 players. Blinds (including heads-up rules and
  short blinds), minimum raises, short all-ins that don't reopen raising, uncalled bets, automatic run-outs, main and
  side pots, split pots with the odd chip left of the button, and a hand evaluator that explains in plain words why one
  hand beats another.
- **Stage 0 · Cards, table words and rules**: a slow-motion first hand with every part of the table named, the "Name
  it" word drill, the ten hand rankings, and drills for Who wins?, Build the best five and Side pots.
- **Stage 1 · Reading the board**: Tap the nuts, Count your outs and Wet or dry.
- **Vocabulary**: every poker word is tappable, new words carry a short explanation in brackets until you've used them
  correctly three times, and a searchable glossary of 111 terms with a word quiz.
- **Practice table**: full hands against simple placeholder bots at 2 to 9 seats. Real bot personalities and the coach
  come in slice 3.
- Two-colour deck like real cards (hearts and diamonds red, spades and clubs black), in Terra Cotta and Wild Orchid.

Progress (learned words, drill scores) is kept in your browser for now; slice 4 adds a proper progress store.

## Develop

```sh
npm install
npm test          # engine tests
npm run dev       # web app with hot reload on http://localhost:5173
npm run typecheck
```

Layout:

| Path | What |
| --- | --- |
| `packages/engine` | Pure TypeScript poker logic: cards, evaluator, pots, hand state machine, board reading, drill generators, placeholder bots |
| `apps/web` | React + Vite app: table, drills, lessons, glossary |
| `apps/server` | Small Fastify server that serves the built app (and future APIs) |
