# Gaia Project Online

Play [Gaia Project](https://boardgamegeek.com/boardgame/220308/gaia-project) in the browser.

## How to play

- **vs AI** — 2–4 seats, with **1, 2, or 3** computer opponents. AI and internet players never sit at the same table.
- **People online** — create a table, share the 5-letter code. No AI at that table.

### Bidding (Board Game Arena)

Each drafted faction gets a secret **maximum VP** bid. When every human has locked their numbers, a round-robin auction resolves automatically: a seat always raises the faction with the largest gap between their max and the current bid (unclaimed current = −1). Afterward everyone receives the highest bid in VP so the winner still starts with **10** to spend.

### Taklons brainstone

When Taklons can charge power, the table asks whether the **brainstone** or a normal token moves. The stone counts as one token and spends as three power.

### Federations

- **AI tables** — only legal federations are listed. The AI will not form an illegal one.
- **People tables** — honor check. Players enter the hexes the table agrees on (`noFedCheck`).

Setup uses the same map rules as a typical Gaia randomizer (7- or 10-sector shape, 01–04 in the center, random rotations). That is game setup only — there is no randomizer page in the site.

## Develop

```bash
npm install
npm test
npm run dev
```

- Client: http://localhost:5173
- API / Socket.IO: http://localhost:3001

Rules execution uses the MIT [`@gaia-project/engine`](https://www.npmjs.com/package/@gaia-project/engine).

The table UI uses photographed sector tiles plus original painted faction portraits, scoring tiles, boosters, federation tokens, and research / scoring boards. AI play is a 1-ply search in the style of the Steam digital app (faction strengths, current-round scoring, and final scoring) rather than random legal moves.
