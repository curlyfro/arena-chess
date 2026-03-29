# Arena Chess — Full Technical Specification

## Context

This document is a complete technical specification of the Arena Chess application — a full-stack chess platform where players compete against AI opponents (Stockfish WASM), earn ELO ratings, solve puzzles, complete tutorials, and track progression through a gamification system. The frontend is a React/TypeScript SPA; the backend is a .NET 10 Clean Architecture API with PostgreSQL.

---

# PART 1: SYSTEM ARCHITECTURE

## 1.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4.2 |
| State | Zustand 5 (persisted to localStorage) |
| Chess Logic | chess.js 1.4 (move validation, PGN, FEN) |
| Chess Engine | Stockfish 18 WASM (Web Worker, single-threaded) |
| Backend | .NET 10, ASP.NET Core, C# |
| ORM | Entity Framework Core 10 + Npgsql (PostgreSQL) |
| Auth | ASP.NET Identity + JWT Bearer (HMAC-SHA256) |
| Validation | FluentValidation 11.3 |
| Caching | HybridCache (in-memory + distributed) |
| Database | PostgreSQL 16 (Docker) |
| API Docs | NSwag (OpenAPI/Swagger) |

## 1.2 Project Structure

```
arena-chess/
├── frontend/
│   └── src/
│       ├── components/        # UI components (board, game, layout, ui, openings, tutorials)
│       ├── hooks/             # 17 custom hooks (game mechanics, analysis, UI)
│       ├── stores/            # 8 Zustand stores
│       ├── types/             # 6 TypeScript type definition files
│       ├── lib/               # Utilities (API client, sounds, openings, puzzles, UCI, coach)
│       ├── constants/         # Configuration (levels, themes, challenges, XP, achievements)
│       ├── workers/           # Stockfish bridge (UCI protocol)
│       ├── App.tsx            # Root router
│       └── index.css          # Tailwind + global styles
├── backend/
│   ├── src/
│   │   ├── ChessArena.Api           # Controllers, middleware, Program.cs
│   │   ├── ChessArena.Application   # DTOs, services, validators
│   │   ├── ChessArena.Core          # Entities, enums, interfaces, constants
│   │   ├── ChessArena.Infrastructure # DbContext, repositories, queries, EF configs
│   │   └── ChessArena.BackgroundJobs # Cleanup service
│   └── tests/
│       ├── ChessArena.IntegrationTests
│       └── ChessArena.UnitTests
└── docker-compose.yml         # PostgreSQL 16
```

## 1.3 Communication

- **Protocol**: REST over HTTPS (no WebSockets)
- **CORS**: `http://localhost:5173` (dev), credentials allowed
- **Proxy**: Vite dev server proxies `/api/*` to backend on `localhost:5016`
- **WASM Headers**: Vite sets `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` for Stockfish Web Worker

---

# PART 2: BACKEND SPECIFICATION

## 2.1 Clean Architecture Layers

```
Core (Domain)           — Entities, enums, interfaces, constants. Zero dependencies.
Application             — DTOs, services, validators. Depends on Core.
Infrastructure          — DbContext, repositories, queries, PGN validator. Depends on Core + Application.
Api (Presentation)      — Controllers, middleware. Depends on Application + Infrastructure.
BackgroundJobs          — Hosted services. Depends on Infrastructure.
```

## 2.2 Domain Entities

### Player (`ChessArena.Core.Entities`)
```
Id                  : Guid (PK)
Username            : string (unique, max 20, alphanumeric + underscore)
ApplicationUserId   : string (unique, max 450, FK → AspNetUsers)
EloBullet           : int (default 1200, floor 1000)
EloBlitz            : int (default 1200, floor 1000)
EloRapid            : int (default 1200, floor 1000)
RdBullet            : int (default 350, rating deviation)
RdBlitz             : int (default 350)
RdRapid             : int (default 350)
GamesBullet         : int (game count for K-factor)
GamesBlitz          : int
GamesRapid          : int
PeakEloBullet       : int (default 1200, for title awards)
PeakEloBlitz        : int (default 1200)
PeakEloRapid        : int (default 1200)
Title               : PlayerTitle enum (default Beginner, stored as string max 20)
CreatedAt           : datetime
LastActiveAt        : datetime
RowVersion          : uint (optimistic concurrency, PostgreSQL xid type)

Computed:
  OverallPeakElo    : int = Max(PeakEloBullet, PeakEloBlitz, PeakEloRapid)

Domain Methods:
  GetRating(tc)             SetRating(tc, rating)
  GetGamesPlayed(tc)        IncrementGamesPlayed(tc)
  GetPeakElo(tc)            SetPeakElo(tc, rating)
  GetRd(tc)                 SetRd(tc, rd)
```
**Indexes**: Unique on `Username`, unique on `ApplicationUserId`
**Check Constraints**: `EloBullet >= 1000`, `EloBlitz >= 1000`, `EloRapid >= 1000`
**Relationships**: 1:N → Games (cascade), 1:N → RatingHistories (cascade)

### Game (`ChessArena.Core.Entities`)
```
Id                  : Guid (PK)
PlayerId            : Guid (FK → Player, cascade delete)
AiLevel             : int (1-8)
AiElo               : int (derived from AiEloMapping)
TimeControl         : TimeControl enum (stored as string max 10)
IsRated             : bool
Result              : GameResult enum (stored as string max 10)
Termination         : Termination enum (stored as string max 30)
PlayerColor         : PlayerColor enum (stored as string max 10)
EloBefore           : int
EloAfter            : int
EloChange           : int
Pgn                 : string (max 50,000 chars)
AccuracyPlayer      : float (0-100)
DurationSeconds     : int
PlayedAt            : datetime
```
**Indexes**: `(PlayerId, PlayedAt)` composite, `(IsRated, TimeControl)` composite
**Note**: Session cap queries use `(PlayerId, PlayedAt, EloChange)` — no dedicated index exists for this pattern.

### RatingHistory (`ChessArena.Core.Entities`)
```
Id                  : Guid (PK)
PlayerId            : Guid (FK → Player, cascade delete)
GameId              : Guid (FK → Game, cascade delete)
TimeControl         : TimeControl enum (stored as string max 10)
Rating              : int
RatingDeviation     : int
RecordedAt          : datetime
```
**Index**: `(PlayerId, TimeControl, RecordedAt)` composite (NOT unique)

### RefreshToken (`ChessArena.Infrastructure.Data.Entities`)
```
Id                  : Guid (PK)
UserId              : string (max 450)
TokenHash           : string (max 256, SHA256, unique index)
ExpiresAt           : datetime
CreatedAt           : datetime
RevokedAt           : datetime? (null = active)
```
**Indexes**: Unique on `TokenHash`, non-unique on `UserId`
**Computed**: `IsExpired`, `IsRevoked`, `IsActive`
**Note**: No FK to AspNetUsers — referenced by string UserId.

### EloSessionCap (`ChessArena.Infrastructure.Data.Entities`)
```
Id                  : Guid (PK)
PlayerId            : Guid
Date                : DateOnly
TotalDelta          : int
```
**Unique Index**: `(PlayerId, Date)`
**Note**: This table exists for cleanup bookkeeping. The actual session cap enforcement queries the Games table directly (see §2.6). Stale entries are cleaned hourly by CleanupService.

### ApplicationUser (`ChessArena.Infrastructure.Identity`)
```
Inherits: IdentityUser
PlayerId            : Guid? (nullable, FK → Player, no cascade)
Player              : Player? (navigation)
```

## 2.3 API Endpoints

### Authentication (`/api/auth`) — Rate Limited: 60/min sliding window

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register + create Player |
| POST | `/api/auth/login` | No | Login, return JWT + refresh token |
| POST | `/api/auth/refresh` | No | Rotate refresh token |
| POST | `/api/auth/revoke` | No | Revoke refresh token |
| GET | `/api/auth/me` | Yes | Current user profile |

**Register Request**:
```json
{ "email": "string", "username": "string (3-20, [a-zA-Z0-9_])", "password": "string (min 8)" }
```
**Auth Response**:
```json
{ "accessToken": "JWT (60min)", "refreshToken": "string (7d, hashed in DB)", "expiresAt": "ISO8601" }
```
**User Profile Response**:
```json
{ "playerId": "guid", "username": "string", "email": "string", "emailConfirmed": "bool" }
```

### Games (`/api/games`) — Rate Limited: token bucket (15 tokens, 10/min)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/games` | Yes | Submit completed game |
| GET | `/api/games/{id}` | No | Game detail with PGN |
| PATCH | `/api/games/{id}/accuracy` | Yes | Update player accuracy post-analysis |

**Submit Game Request**:
```json
{
  "aiLevel": 1-8,
  "timeControl": "bullet|blitz|rapid|custom",
  "isRated": true,
  "result": "win|loss|draw",
  "termination": "checkmate|resign|flag|draw_agreed|stalemate|threefold_repetition|fifty_move_rule|insufficient_material",
  "playerColor": "white|black",
  "pgn": "string (max 50k, validated SAN)",
  "accuracyPlayer": 0-100,
  "durationSeconds": "> 0"
}
```
**Submit Game Response**:
```json
{ "gameId": "guid", "eloBefore": 1200, "eloAfter": 1215, "eloChange": 15, "newTitle": "ClubPlayer|null" }
```

### Players (`/api/players`) — No rate limit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/players/{id}` | No | Profile + computed stats |
| GET | `/api/players/{id}/games` | No | Paginated game history (default page=1, pageSize=20) |
| GET | `/api/players/{id}/rating-history` | No | ELO progression (default limit=100, optional timeControl filter) |

**Player Profile Response**:
```json
{
  "id": "guid", "username": "string", "title": "string",
  "eloBullet": 1200, "eloBlitz": 1200, "eloRapid": 1200,
  "rdBullet": 350, "rdBlitz": 350, "rdRapid": 350,
  "stats": {
    "totalGames": 0, "wins": 0, "losses": 0, "draws": 0,
    "winRate": 0.0, "currentStreak": 0, "longestStreak": 0
  },
  "createdAt": "ISO8601", "lastActiveAt": "ISO8601"
}
```

### Leaderboard (`/api/leaderboard`) — Cached 15min (local: 5min)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/leaderboard?timeControl=blitz` | No | Top 100 by rating |

**Response**: `[{ rank, playerId, username, title, rating, gamesPlayed }]`

### Health (`/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | DB connectivity check |
| GET | `/api/config` | Version + environment |

## 2.4 Data Access Layer

### Repositories

All repositories are sealed classes, scoped lifetime, constructor-injected with `AppDbContext`.

**PlayerRepository** (`IPlayerRepository`):
| Method | EF Pattern | Index Used |
|--------|-----------|------------|
| `GetByIdAsync(Guid id)` | `FindAsync([id])` — PK lookup, may use local cache. Does NOT Include navigations. | PK |
| `GetByUsernameAsync(string)` | `FirstOrDefaultAsync(p => p.Username == username)` | IX_Players_Username (unique) |
| `GetByApplicationUserIdAsync(string)` | `FirstOrDefaultAsync(p => p.ApplicationUserId == userId)` | IX_Players_ApplicationUserId (unique) |
| `AddAsync(Player)` | `db.Players.AddAsync()` | — |
| `SaveChangesAsync()` | `db.SaveChangesAsync()` — RowVersion checked on update | — |

**GameRepository** (`IGameRepository`):
| Method | EF Pattern | Index Used |
|--------|-----------|------------|
| `GetByIdAsync(Guid id)` | `.Include(g => g.Player).FirstOrDefaultAsync(g => g.Id == id)` | PK + Player FK |
| `GetByPlayerIdAsync(Guid, int page, int pageSize)` | `.Where(PlayerId).OrderByDescending(PlayedAt).Skip().Take()` | IX_Games_PlayerId_PlayedAt |
| `GetCountByPlayerIdAsync(Guid)` | `.CountAsync(g => g.PlayerId == playerId)` | IX_Games_PlayerId_PlayedAt |
| `AddAsync(Game)` | `db.Games.AddAsync()` | — |
| `SaveChangesAsync()` | `db.SaveChangesAsync()` | — |

**RatingHistoryRepository** (`IRatingHistoryRepository`):
| Method | EF Pattern | Index Used |
|--------|-----------|------------|
| `GetByPlayerIdAsync(Guid, TimeControl?, int limit=100)` | `.Where(PlayerId)[.Where(TimeControl)].OrderByDesc(RecordedAt).Take(limit).OrderBy(RecordedAt)` — fetches most recent N, returns chronologically | IX_RatingHistories_PlayerId_TimeControl_RecordedAt |
| `AddAsync(RatingHistory)` | `db.RatingHistories.AddAsync()` | — |
| `SaveChangesAsync()` | `db.SaveChangesAsync()` | — |

### Queries (Read-Optimized)

**LeaderboardQuery** (`ILeaderboardQuery`):
- `GetTopPlayersAsync(TimeControl tc, int limit=100)`
- Filters: `GamesPlayed > 0` for selected time control
- Projects: Id, Username, Title, Rating, GamesPlayed (selected per TC via switch expression)
- Sort: Rating DESC, Take(limit)
- Post-query: assigns rank (1-indexed) in memory
- **No index optimization** — performs table scan on Players

**PlayerStatsQuery** (`IPlayerStatsQuery`):
- `GetAsync(Guid playerId)`
- Fetches ALL game Results for player ordered by PlayedAt
- In-memory computation: wins, losses, draws, winRate, currentStreak (at end of history), longestStreak
- Returns `PlayerStatsResponse`

### Unit of Work

**Interface**: `IUnitOfWork` (in `ChessArena.Core.Interfaces`)
**Implementation**: `UnitOfWork` (in `ChessArena.Infrastructure.Data`)
**Lifetime**: Scoped

```
BeginTransactionAsync()  — Starts explicit DB transaction (throws if already active)
CommitAsync()            — SaveChanges + Commit + Dispose (throws if no active transaction)
RollbackAsync()          — Rollback + Dispose (no-op if no active transaction)
```

Used by `AuthController.Register` and `GameResultService.ProcessResultAsync` for multi-entity atomicity.

### Session Cap Service

**Interface**: `ISessionCapService` (in `ChessArena.Core.Interfaces`)
**Implementation**: `SessionCapService` (in `ChessArena.Infrastructure.Cache`)
**Lifetime**: Scoped

**Critical for DynamoDB migration**: Does NOT use the EloSessionCaps table. Queries Games directly:
```sql
SELECT SUM(EloChange) FROM Games
WHERE PlayerId = @playerId
  AND PlayedAt >= NOW() - INTERVAL '24 hours'
  AND EloChange > 0
```
Returns true if `currentTotal + proposedDelta <= 80`.

### Concurrency Control
- **Player**: Uses `RowVersion` (PostgreSQL `xid` type) for optimistic concurrency. EF throws `DbUpdateConcurrencyException` on conflict.
- **All other entities**: Last-write-wins (no concurrency control).

## 2.5 ELO Rating System

### Calculation (FIDE Logistic)
```
Expected Score:  E = 1 / (1 + 10^((opponentRating - playerRating) / 400))
                 Rating diff clamped to ±400

K-Factor:        < 30 games  → K = 40
                 ≥ 30 games, < 2400 rating → K = 20
                 ≥ 30 games, ≥ 2400 rating → K = 10

Delta:           Δ = K × (actualScore - E)
                 actualScore: Win=1.0, Draw=0.5, Loss=0.0
                 Rounded away from zero

Constraints:
  - Low AI Cap: Levels 1-3 → Δ clamped to ±20
  - Rating Floor: 1000 minimum
  - Session Cap: +80 max per 24-hour rolling window
```

### Rating Deviation
```
Initial: 350    Minimum: 50    Per-game reduction: 2    Weekly decay: 5
```

### Title Awards (never revoked)
```
Peak Rating (any time control)    Title
2400+                             Grandmaster
2200+                             Master
2000+                             Candidate Master
1800+                             Expert
1600+                             Advanced
1400+                             Intermediate
1200+                             Club Player
< 1200                            Beginner
```

### AI ELO Mapping
```
Level 1 → 400    Level 2 → 600    Level 3 → 800     Level 4 → 1000
Level 5 → 1200   Level 6 → 1500   Level 7 → 1800    Level 8 → 2500
```

## 2.6 PGN Validation Pipeline

1. Extract result token (`1-0`, `0-1`, `1/2-1/2`) — reject `*` (in-progress)
2. Cross-validate result token against declared `result` + `playerColor`
3. Extract SAN moves via regex: `^(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?$`
4. Verify move numbers are sequential
5. Reject if validation fails (400 Bad Request)

## 2.7 Game Result Processing Pipeline

`GameResultService.ProcessResultAsync()` — wrapped in `IUnitOfWork` transaction:

```
SubmitGameRequest
  → FluentValidation (field-level, in controller)
  → PGN Validation (IPgnValidator.ValidateAsync — structural + cross-validation)
  → Load Player (via repository)
  → IUnitOfWork.BeginTransactionAsync()
  → Get AI ELO from AiEloMapping
  → Calculate ELO delta (FIDE logistic + K-factor) — only if rated AND timeControl != Custom
  → Apply Low AI Cap (levels 1-3: ±20)
  → Apply Rating Floor (Math.Max(newRating, 1000), recalculate delta)
  → Check Session Cap via ISessionCapService (+80/day, queries Games table)
    → If cap exceeded: eloChange = 0, newRating = eloBefore
  → Update Player: rating, gamesPlayed++, RD -= 2 (min 50), peak ELO, lastActiveAt
  → TitleAwardService.TryUpgradeTitle(player) — only upgrades, never revokes
  → Create Game entity
  → GameRepository.AddAsync(game)
  → Create RatingHistory snapshot (if rated && timeControl != Custom)
  → RatingHistoryRepository.AddAsync(entry)
  → IUnitOfWork.CommitAsync() (SaveChanges + Commit)
  → On failure: IUnitOfWork.RollbackAsync() + re-throw
  → Return Game entity
```

## 2.8 Authentication Flow

```
Register:
  → Create AspNetUser (Identity)
  → Create Player entity (linked via ApplicationUserId)
  → Generate JWT (60min) + RefreshToken (7d, SHA256-hashed in DB)

Login:
  → Validate credentials via Identity
  → Check lockout (5 failures → 15min)
  → Generate JWT + RefreshToken

Refresh:
  → Find token by SHA256 hash
  → Validate not expired/revoked
  → Revoke old token (set RevokedAt)
  → Issue new JWT + RefreshToken

JWT Claims:
  sub (NameIdentifier) = AspNetUser.Id
  name = Username
  email = Email
  playerId = Player.Id
```

## 2.9 Middleware Pipeline Order

```
1. Serilog request logging
2. Global exception handler (InvalidOperationException → 422, ArgumentException → 400, others → 500)
3. CORS
4. Authentication
5. Authorization
6. Rate limiting
7. Controller routing
```

## 2.10 Background Jobs

**CleanupService** (hourly, runs immediately on startup then every 1hr via PeriodicTimer):
- Deletes stale ELO session caps where `Date < today`
- Deletes refresh tokens where `ExpiresAt < now OR RevokedAt IS NOT NULL` (expired AND revoked)
- Uses `ExecuteDeleteAsync` for bulk server-side deletion
- Logs cleanup counts; errors are caught and logged without terminating service

## 2.11 Dependency Injection Lifetimes

```
Singleton:  IEloRatingService, TitleAwardService, IPgnValidator
Scoped:     IGameResultService, ISessionCapService, IUnitOfWork,
            IPlayerRepository, IGameRepository, IRatingHistoryRepository,
            IPlayerStatsQuery, ILeaderboardQuery
Transient:  GlobalExceptionHandler (middleware)
```

---

# PART 3: FRONTEND SPECIFICATION

## 3.1 Routing

```
/                  → GamePage (dashboard + active game)
/puzzles           → PuzzlePage
/profile           → ProfilePage
/leaderboard       → LeaderboardPage
/openings          → OpeningExplorerPage
/tutorials         → TutorialPage
/game/:id          → ReviewPage (game analysis)
/*                 → Redirect to /
```

## 3.2 State Management (Zustand Stores)

### Game Store (`chess-arena-state`, localStorage v5)

**Persisted (PreferencesSlice):**
```
boardThemeId        : string ("dark-green" default, 7 themes)
pieceSet            : "merida" | "neo"
boardFlipped        : bool
soundEnabled        : bool
soundVolume         : number (0-100)
showCoordinates     : bool
showEvalBar         : bool
autoAnalyze         : bool
avatarId            : string | null
avatarImage         : string | null (data URL)
lastGameSettings    : { levelIndex, timeControlId, colorChoice, isRated } | null
winStreak           : number
bestWinStreak       : number
```

**Game State (PERSISTED for game resumption on reload):**
```
session             : GameSession | null  { playerColor, engineLevel, timeControl, isRated }
fen                 : string
history             : AnnotatedMove[]
status              : GameStatus
result              : GameResult
turn                : PieceColor
clock               : ClockState { whiteMs, blackMs, activeColor, flaggedColor }
lastMove            : { from, to } | null
```

**Game State (EPHEMERAL — not persisted):**
```
isCheck             : bool
engineBusy          : bool
evalHistory         : EvalScore[] (max 500)
bestMoveArrow       : { from, to } | null
premove             : ChessMove | null
postGameStats       : PostGameStats | null
```

### Auth Store (NO zustand persist — manual localStorage)
```
localStorage keys: "chess-arena-token" (JWT), "chess-arena-refresh-token" (refresh token)

user                : UserProfile | null
playerProfile       : PlayerProfile | null
token               : string | null (initialized from localStorage on create)
isLoading           : bool
error               : string | null
Methods: login(), register(), logout(), loadUser(), refreshProfile()

Note: Does NOT use zustand persist middleware. Tokens are stored/removed manually
via localStorage.setItem/removeItem. On login/register, calls hydrateSession()
which stores both tokens and fetches user profile + player profile.
Logout revokes refresh token on backend (fire-and-forget) then clears localStorage.
```

### Level Store (`chess-arena-level`, v1)
```
totalXp             : number
pendingXpGain       : number
pendingLevelUp      : bool
Methods: addXp(amount), clearPendingXp(), getLevel() → { level, currentLevelXp, nextLevelXp, progress }
```

### Achievement Store (`chess-arena-achievements`)
```
unlockedIds         : string[]
pendingToast        : string | null
pendingCelebration  : string | null
Methods: unlock(id), dismissToast(), dismissCelebration()
```

### Puzzle Store (`chess-arena-puzzles`)
```
puzzleRating        : number (starts 1000, Glicko-style K=32, floor 400)
currentStreak       : number
bestStreak          : number
totalSolved         : number
totalAttempted      : number
seenPuzzleIds       : string[] (capped at 400)
dailyCompletedDates : string[] (ISO dates)
Methods: recordCorrect(puzzleRating), recordIncorrect(), addSeenPuzzle(), getDailyStreak()
```

### Tutorial Store (`chess-arena-tutorials`)
```
completedLessons    : string[]
lessonProgress      : Record<string, number>
Methods: completeLesson(id, xpReward), setLessonProgress(id, step), getCategoryProgress(category)
```

### Challenge Store (`chess-arena-challenges`)
```
dailyChallenges     : ActiveChallenge[] (2 per day)
weeklyChallenges    : ActiveChallenge[] (1 per week)
lastDailyDate       : string
lastWeeklyDate      : string
Methods: refreshChallenges(), onGameComplete(won, aiLevel, playerColor), onPuzzleSolved()
```
Challenge types: `win-count`, `beat-level`, `solve-puzzles`, `play-games`, `win-as-black`
Selection: deterministic seed based on date

### Onboarding Store (`chess-arena-onboarding`)
```
hasCompletedOnboarding : bool
Methods: completeOnboarding()
```

## 3.3 Component Architecture

### GamePage (Main View)

When `session === null` or `status === "idle"`:
```
Dashboard
├── RatingCard (current ELO per time control)
├── LevelBadge (XP level + progress bar)
├── ChallengeCard (daily/weekly challenges)
├── RecentGameRow (last games summary)
├── OnboardingOverlay (first-time user)
└── PgnImportDialog
```

When game is active:
```
GamePage
├── GameHeader
├── PlayerClockRow (opponent)
│   ├── CircularClock
│   └── PlayerAvatar
├── EvalBar (vertical, with eval graph) — desktop
├── MobileEvalPill — mobile
├── ChessBoard (SVG 8x8)
│   ├── Square (64 squares, click handlers)
│   ├── Piece (draggable SVG images)
│   ├── HighlightLayer (legal moves, last move, check, premove)
│   ├── DragLayer (real-time drag animation)
│   ├── CoordinateLabels (a-h, 1-8)
│   ├── BestMoveArrow (engine suggestion)
│   ├── UserAnnotationLayer (drawn arrows)
│   ├── PromotionDialog (Q/R/B/N selection)
│   └── MoveAnimationLayer (150ms WAAPI)
├── PlayerClockRow (player)
├── GameSidebar
│   ├── GameControls (resign, draw, takeback)
│   ├── ThinkingIndicator (engine status)
│   ├── MoveHistory (virtualized via @tanstack/react-virtual)
│   ├── MoveStrip (compact notation)
│   ├── EvalGraph (eval over time)
│   ├── MoveAnnotation (classification badges)
│   ├── ReplayControls (arrow key navigation)
│   ├── PostGamePanel (result, rating change)
│   └── CoachBubble (contextual tips)
└── CapturedPieces
```

### Board Rendering
- **SVG-based** (not canvas) — crisp scaling, accessible
- Square size: 64px (512x512 base grid)
- Colors from active `BoardTheme` object
- Pieces loaded as SVG from `/pieces/{pieceSet}/{color}{piece}.svg`
- Drag via pointerdown/pointermove/pointerup events
- 4px drag threshold before activation
- WAAPI for smooth 150ms move animations
- Board flipping supported (coordinate labels rotate)

## 3.4 Custom Hooks

### Core Game Mechanics

| Hook | File | Purpose |
|------|------|---------|
| `useChessGame` | `use-chess-game.ts` | Move validation via chess.js, FEN/history/status/result management |
| `useGameClock` | `use-game-clock.ts` | RAF-based countdown, increment, flag detection |
| `useBoardInteraction` | `use-board-interaction.ts` | Click/drag input, promotion, premove detection |
| `usePremove` | `use-premove.ts` | Queue + execute premove on turn switch |
| `useStockfishWorker` | `use-stockfish-worker.ts` | Engine init, findBestMove, analysis, eval streaming |
| `useDrawOffer` | `use-draw-offer.ts` | Draw offer state machine (offered/accepted/declined/expired) |
| `useHistoryNavigation` | `use-history-navigation.ts` | Arrow key move replay, Home/End, viewingBoard state |

### Analysis & Submission

| Hook | File | Purpose |
|------|------|---------|
| `useGameAnalysis` | `use-game-analysis.ts` | Post-game depth-14 analysis, move classification, accuracy |
| `useGameSubmission` | `use-game-submission.ts` | Submit to backend, receive ELO change |

### Gamification

| Hook | File | Purpose |
|------|------|---------|
| `useAchievementChecker` | `use-achievement-checker.ts` | Check game/puzzle/tutorial/rating achievements |
| `usePuzzle` | `use-puzzle.ts` | Puzzle flow: setup move → validate player → auto-reply |
| `useTutorial` | `use-tutorial.ts` | Step-based lesson progression with hints |

### UI & Preferences

| Hook | File | Purpose |
|------|------|---------|
| `useBoardTheme` | `use-board-theme.ts` | Theme, piece set, coordinates, eval bar, auto-analyze |
| `useKeyboardShortcuts` | `use-keyboard-shortcuts.ts` | 'h' = hint, '?' = help |
| `useOpeningExplorer` | `use-opening-explorer.ts` | Tree navigation, search, continuations |
| Sound system | `lib/sounds.ts` | MP3 + WebAudio fallback for move/capture/check/castle/gameEnd |

## 3.5 Chess Engine Integration (Stockfish 18 WASM)

### Initialization
```
1. Create Web Worker from /stockfish/stockfish-18-single.js
2. UCI handshake: "uci" → wait for "uciok"
3. "isready" → wait for "readyok"
4. setoption Hash = 32MB (desktop) or 16MB (mobile, detected via navigator.deviceMemory)
```

### 8 Engine Levels

| Level | Name | ELO | Skill | Depth | MoveTime | Blunder% | LimitStrength | Delay |
|-------|------|-----|-------|-------|----------|----------|---------------|-------|
| 1 | Woody (Beginner) | 400 | 0 | 1 | 50ms | 45% | true | 800ms |
| 2 | Luna (Novice) | 600 | 1 | 1 | 100ms | 30% | true | 600ms |
| 3 | Felix (Amateur) | 800 | 3 | 2 | 200ms | 15% | true | 400ms |
| 4 | Nadia (Club Player) | 1000 | 5 | 4 | 300ms | 8% | true | 300ms |
| 5 | Gareth (Intermediate) | 1200 | 8 | 6 | 500ms | 0% | true | 0ms |
| 6 | Sable (Advanced) | 1500 | 14 | 10 | 750ms | 0% | true | 0ms |
| 7 | Viktor (Expert) | 1800 | 17 | 14 | 1000ms | 0% | false | 0ms |
| 8 | Kassia (Master) | 2500 | 20 | 20 | 2000ms | 0% | false | 0ms |

### Move Selection Algorithm
```
findBestMove(fen, level):
  1. setoption Skill Level = level.skillLevel
  2. setoption UCI_LimitStrength = level.limitStrength
  3. setoption UCI_Elo = level.elo (if limitStrength)
  4. IF blunderChance > 0 AND random() < blunderChance:
       MultiPV = 4 → pick candidate 2-4 (plausible but weak)
     ELSE:
       Normal search at level.depth
  5. "position fen {fen}"
  6. "go depth {depth} movetime {moveTimeMs}"
  7. Wait for "bestmove" UCI response
  8. Wait artificialDelayMs (human-like pause)
  9. Execute move
```

### Real-Time Analysis
- During game: evals streamed to `evalHistory` (capped at 500)
- `bestMoveArrow` updated on each eval
- Post-game: depth-14 sequential analysis of all positions

## 3.6 Game Flow (Complete Lifecycle)

### Phase 1: New Game
```
Dashboard → "New Game" button → NewGameDialog
  → Select: AI level (1-8), time control, color (w/b/random), rated toggle
  → Creates GameSession { playerColor, engineLevel, timeControl, isRated }
  → Saves to lastGameSettings for quick rematch
  → useChessGame resets to INITIAL_FEN
  → useGameClock initializes with timeControl.initialMs
  → Stockfish worker boots
```

### Phase 2: Active Game — Player Turn
```
Player clicks/drags piece
  → useBoardInteraction detects input
  → Legal moves highlighted (green dots/rings)
  → On drop/click target:
    IF promotion: show PromotionDialog → select piece
    → useChessGame.makeMove({ from, to, promotion? })
    → chess.js validates → returns AnnotatedMove or null
    → On success:
      - History updated with SAN, FEN, captured, flags
      - Store synced (fen, history, status, turn, isCheck, lastMove)
      - Clock switches to opponent, player gets increment
      - Sound plays (move/capture/check/castle)
      - Coach tip generated if applicable
```

### Phase 3: Active Game — Engine Turn
```
Engine's turn triggered
  → useStockfishWorker.findBestMove(fen, engineLevel)
  → UCI commands sent to worker
  → Eval streamed to store (bestMoveArrow updated)
  → "bestmove" received → parse UCI move
  → useChessGame.makeMove(engineMove)
  → Clock switches to player, engine gets increment
  → Check premove queue → tryExecutePremove if queued
```

### Phase 4: Premove
```
During opponent's turn, player queues move
  → useBoardInteraction detects it's not player's turn
  → Queued as premove (blue highlight)
  → On opponent move completion:
    → tryExecutePremove validates legality in new position
    → Execute if legal, discard if illegal
```

### Phase 5: Game End Detection
```
After each move, chess.js checks:
  - isCheckmate()  → status="checkmate", result based on checkmated side
  - isStalemate()  → status="stalemate", result="1/2-1/2"
  - isThreefoldRepetition() → status="draw_repetition"
  - isInsufficientMaterial() → status="draw_insufficient"
  - isDraw() (50-move) → status="draw_50move"

Manual terminations:
  - Resign button → status="resigned", loser = resigning player
  - Draw offer accepted → status="draw_agreement"
  - Clock flag → status="flagged", loser = flagged player
```

### Phase 6: Post-Game
```
Game over detected
  → Clock stops
  → IF rated AND authenticated:
    → useGameSubmission.submit(gameData)
    → Backend validates PGN, calculates ELO
    → Response: { eloChange, newTitle }
  → useLevelStore.addXp(gameXp)  (50 base + 30 win + 10 checkmate)
  → useAchievementChecker.checkGameAchievements()
  → useChallengeStore.onGameComplete(won, aiLevel, playerColor)
  → IF autoAnalyze:
    → useGameAnalysis.handleAnalyzeGame()
    → Depth-14 analysis of every position
    → Classify moves → compute PostGameStats
    → PATCH /api/games/{id}/accuracy
  → PostGamePanel shows results
  → Options: Play Again, Return to Dashboard
```

## 3.7 Move Classification & Accuracy

### Classification Thresholds (centipawn loss)
```
cpLoss >= 200  → blunder (??)
cpLoss >= 100  → mistake (?)
cpLoss >= 50   → inaccuracy (?!)
cpLoss >= 20   → good
cpLoss < 20    → best
```
Additional: `brilliant` (!!) and `great` (!) exist in the type system.

### Mate Score Conversion
```
mateCp = sign × (10000 - |mateIn| × 10)
Example: mate-in-1 = ±9990 CP
```

### Accuracy Formula (Lichess-style)
```
accuracy = max(0, min(100, 103.1668 × e^(-0.04354 × avgCentipawnLoss) - 3.1669))
```

## 3.8 Puzzle System

### Data Sources
- Primary: `/public/puzzles.json` (~2000+ puzzles, async load)
- Fallback: 60+ inline puzzles in `lib/puzzles.ts`

### Puzzle Format
```
{ id, fen, moves: string[] (UCI), rating, themes: string[] }
moves[0] = setup move (auto-played)
moves[1] = player's expected first response
moves[2] = opponent's auto-reply
... alternating
```

### Puzzle Flow
```
1. Select puzzle near player rating (±8 rating band)
2. Set board to puzzle FEN
3. Auto-play moves[0] after 600ms delay
4. Player makes a move
5. Validate: player's UCI must match moves[moveIndex]
6. IF correct: auto-play moves[moveIndex+1] after 400ms, continue
7. IF incorrect: status="incorrect", record in stats
8. IF all moves matched: status="correct"
9. Update puzzle rating (Glicko K=32)
10. Update streak, totalSolved, totalAttempted
```

### Daily Puzzle
- `getDailyPuzzle(dateStr)`: deterministic selection seeded by date
- Tracked in `dailyCompletedDates` for streak calculation

## 3.9 Opening Explorer

### Data
- Tree: `/public/opening-tree.json` (388 KB, hierarchical)
- Inline: `lib/openings.ts` (100+ openings, flat SAN-keyed map)

### Tree Structure
```typescript
interface OpeningTreeNode {
  eco?: string;        // "C60"
  name?: string;       // "Ruy Lopez"
  children?: Record<string, OpeningTreeNode>;  // keyed by SAN
}
```

### Lookup
- `lookupOpening(history)`: walks move history, returns deepest match
- `useOpeningExplorer`: navigates tree interactively, shows continuations
- `searchOpenings(tree, query)`: searches ECO + name fields

## 3.10 Tutorial System

### Categories
- `basics`, `openings`, `midgame`, `endgame`
- ~15-20 lessons per category

### Step Types
```
"instruction" — Text explanation with optional highlights/arrows
"move"        — Player must make a specific move; hint available; auto-reply from opponent
"freeplay"    — Player moves freely on the board
```

### Flow
```
1. Select lesson → load steps
2. Display step title + text
3. Show board at step.fen with highlights/arrows
4. IF "move": wait for expectedMove, show hint on request
5. IF correct: auto-play autoReply if set, advance step
6. On final step: mark lesson complete, award XP
```

## 3.11 Gamification System

### XP Rewards
```
gameComplete:       50 XP
gameWin:            30 XP
gameCheckmate:      10 XP
puzzleSolve:        20 XP
dailyPuzzle:        30 XP
achievementUnlock:  100 XP
tutorialLesson:     25 XP
```

### Level Progression
```
xpForLevel(n) = Math.round(100 × n × 1.1^n)

Per-level XP requirement (not cumulative):
  Level 1:  110 XP     Level 5:   ~805 XP
  Level 10: ~2,594 XP  Level 20:  ~13,455 XP

Cumulative XP to reach level:
  Level 1:  110       Level 5:   ~2,870
  Level 10: ~11,300   Level 20:  ~62,000

computeLevel(totalXp): Iterates from L0, subtracting xpForLevel(n+1) each step.
```

### Achievements (25 total)

**Games (11):** first-win, win-as-black, beat-l1/l3/l5/l8, streak-5/streak-10, quick-win, flag-win, checkmate-win

**Puzzles (6):** puzzle-10/50/100, puzzle-streak-5, daily-3/daily-7

**Rating (5):** elo-1200/1400/1600/1800/2000

**Tutorials (3):** tutorial-first, tutorial-basics, tutorial-all

### Challenges
- **Daily** (2): seeded by date, types: win-count, beat-level, solve-puzzles, play-games, win-as-black (30-80 XP)
- **Weekly** (1): seeded by week, larger targets (100-150 XP)
- Selection is deterministic — same challenge for all players on same day

### Titles (from backend)
```
Beginner → Club Player → Intermediate → Advanced → Expert → Candidate Master → Master → Grandmaster
```
Based on peak ELO across any time control. Never revoked.

## 3.12 Coaching System

`lib/game-coach.ts` generates contextual tips:

| Trigger | Type | Example |
|---------|------|---------|
| Eval drop > 200 CP | warning | "That move lost material!" |
| Eval drop > 80 CP | warning | "Not the strongest move." |
| Early queen move (moves 1-8) | teaching | "Developing your queen early can be risky" |
| Castled | praise | "Great! Castling protects your king" |
| Checkmate delivered | praise | "Checkmate! Well played!" |

## 3.13 Time Controls

| ID | Label | Category | Initial | Increment |
|----|-------|----------|---------|-----------|
| bullet-1-0 | 1+0 | bullet | 60s | 0s |
| blitz-5-0 | 5+0 | blitz | 300s | 0s |
| blitz-5-3 | 5+3 (default) | blitz | 300s | 3s |
| rapid-15-10 | 15+10 | rapid | 900s | 10s |

Clock implemented via `requestAnimationFrame` for smooth countdown.

## 3.14 Board Themes

7 themes: `classic-wood`, `dark-green` (default), `blue-ice`, `brown`, `purple`, `tournament`, `coral`

Each defines: `lightSquare`, `darkSquare`, `highlightLastMove`, `highlightLegalMove`, `highlightCheck`, `highlightPremove`

2 piece sets: `merida` (default), `neo` — 24 SVG files each (6 types × 2 colors)

## 3.15 Audio System

### Sound Events
`move`, `capture`, `check`, `castle`, `lowTime`, `gameEnd`, `checkmate`, `illegal`, `achievement`

### Implementation
- Primary: MP3 files from `/sounds/` loaded via Web Audio API
- Fallback: Procedural audio (oscillators + noise generators)
- Volume: 0-100 scale, stored in game store
- Loaded on first user interaction (browser autoplay policy)

## 3.16 Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| ← / → | Game/Review | Previous/next move |
| Home / End | Game/Review | First/last move |
| Escape | Game | Return to live position |
| f | Game | Flip board |
| h | Game | Show hint (best move arrow) |
| ? | Global | Toggle shortcut help |

---

# PART 4: DATA FLOW DIAGRAMS

## 4.1 Game Submission Flow
```
Frontend                              Backend
────────                              ───────
PostGamePanel
  → gameApi.submit(request)     →     POST /api/games
                                        → FluentValidation
                                        → PgnValidator.Validate()
                                        → GameResultService.ProcessResultAsync()
                                          → EloRatingService.CalculateDelta()
                                          → SessionCapService.CheckCap()
                                          → Player.UpdateRating()
                                          → TitleAwardService.CheckTitle()
                                          → GameRepository.Add()
                                          → RatingHistoryRepository.Add()
                                          → SaveChanges (transaction)
  ← SubmitGameResponse          ←     { gameId, eloBefore, eloAfter, eloChange, newTitle }
  → Update auth store profile
  → Update level store (XP)
  → Check achievements
  → Update challenges
```

## 4.2 Authentication Flow
```
Frontend                              Backend
────────                              ───────
AuthModal (login/register)
  → authApi.login(email, pass)  →     POST /api/auth/login
                                        → Identity.SignInManager
                                        → Generate JWT (60min)
                                        → Generate RefreshToken (7d)
  ← { accessToken, refreshToken } ←
  → Store token in localStorage
  → Store refreshToken in localStorage
  → authApi.getMe()             →     GET /api/auth/me (Bearer token)
  ← UserProfile                 ←
  → Store user + playerProfile

Token refresh (on 401):
  → authApi.refresh(refreshToken) →   POST /api/auth/refresh
                                        → Validate hash, check expiry
                                        → Revoke old, issue new pair
  ← New { accessToken, refreshToken } ←
```

## 4.3 Engine Move Flow
```
GamePage (engine's turn)
  → useStockfishWorker.findBestMove(fen, level)
  → StockfishBridge.send("setoption name Skill Level value N")
  → StockfishBridge.send("position fen {fen}")
  → StockfishBridge.send("go depth N movetime Nms")
  ← Worker: "info depth 8 score cp 35 ..."  → pushEval(), setBestMoveArrow()
  ← Worker: "bestmove e2e4"
  → Wait artificialDelayMs
  → useChessGame.makeMove({ from: "e2", to: "e4" })
  → syncPosition to store
  → Switch clock
  → Try execute premove if queued
```

---

# PART 5: PERSISTENCE & LOCAL STORAGE

## 5.1 localStorage Keys

| Key | Store | Version | Middleware | Content |
|-----|-------|---------|-----------|---------|
| `chess-arena-state` | Game Store | 5 | immer + persist | Preferences + game state for resumption |
| `chess-arena-token` | Auth Store (manual) | — | — | JWT access token |
| `chess-arena-refresh-token` | Auth Store (manual) | — | — | Refresh token |
| `chess-arena-level` | Level Store | 1 | persist | totalXp only |
| `chess-arena-achievements` | Achievement Store | — | persist | unlockedIds only (toast/celebration ephemeral) |
| `chess-arena-puzzles` | Puzzle Store | — | persist | Full state (rating, streaks, seen IDs, daily dates) |
| `chess-arena-tutorials` | Tutorial Store | — | persist | Full state (completed lessons, progress) |
| `chess-arena-challenges` | Challenge Store | — | immer + persist | Challenges + last refresh dates |
| `chess-arena-onboarding` | Onboarding Store | — | persist | Full state (hasCompletedOnboarding) |

## 5.2 PostgreSQL Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `AspNetUsers` | Identity (email, password hash) | 1:1 → Player |
| `Players` | Chess profile, ratings, title | 1:N → Games, RatingHistories |
| `Games` | Completed game records with PGN | N:1 → Player |
| `RatingHistories` | ELO snapshots after each game | N:1 → Player, N:1 → Game |
| `RefreshTokens` | JWT refresh token hashes | N:1 → AspNetUser |
| `EloSessionCaps` | Daily ELO gain tracking | N:1 → Player |

---

# PART 6: SECURITY

## 6.1 Authentication
- JWT (HMAC-SHA256, 60min expiry, zero clock skew)
- Refresh tokens: SHA256-hashed in DB, 7-day expiry, one-use rotation
- Account lockout: 5 failed attempts → 15 min
- Password: 8+ characters (no special char requirement)

## 6.2 Rate Limiting
- Auth endpoints: 60/min sliding window (6 segments)
- Game submission: Token bucket (15 burst, 10/min refill)
- Rejection: 429 Too Many Requests

## 6.3 Input Validation
- FluentValidation on all request DTOs
- PGN structural validation + cross-field validation
- Entity constraints (ELO floor 1000, PGN max 50k chars)

## 6.4 Anti-Farming
- Low AI cap: Levels 1-3 limited to ±20 ELO per game
- Session cap: +80 ELO max per 24-hour rolling window
- PGN cross-validated against declared result

---

# PART 7: EXTERNAL DEPENDENCIES

## 7.1 Frontend Assets (Static)
- Stockfish 18 WASM: `/public/stockfish/` (single-threaded build)
- Piece SVGs: `/public/pieces/{merida,neo}/` (24 files each)
- Sound MP3s: `/public/sounds/` (6 files)
- Opening tree: `/public/opening-tree.json` (388 KB)
- Puzzle DB: `/public/puzzles.json` (~100 KB)
- Icon sprite: `/public/icons.svg` (26 icons)

## 7.2 Backend Services
- PostgreSQL 16 (Docker: `localhost:5432`)
- No external APIs, message queues, or third-party services

## 7.3 Key npm Packages
- `chess.js` 1.4 — move validation, PGN, FEN
- `stockfish` 18.0.5 — WASM engine
- `zustand` 5 + `immer` — state management
- `@tanstack/react-virtual` — virtualized move list
- `@radix-ui/react-dialog` — accessible modals
- `canvas-confetti` — celebration effects
- `axios` — HTTP client

## 7.4 Key NuGet Packages
- `Npgsql.EntityFrameworkCore.PostgreSQL` — PostgreSQL provider
- `FluentValidation.AspNetCore` — request validation
- `Microsoft.Extensions.Caching.Hybrid` — in-memory + distributed cache
- `Serilog.AspNetCore` — structured logging
- `NSwag.AspNetCore` — OpenAPI docs

---

# PART 8: DATA ACCESS PATTERNS (DynamoDB Migration Reference)

This section catalogs every database query pattern in the application to inform a PostgreSQL → DynamoDB migration.

## 8.1 Query Pattern Inventory

### Player Queries
| Operation | Current SQL Pattern | Access Pattern |
|-----------|-------------------|----------------|
| Get by ID | `FindAsync(PK)` | Point read by GUID |
| Get by username | `WHERE Username = @username` | Point read by unique alternate key |
| Get by user ID | `WHERE ApplicationUserId = @userId` | Point read by unique alternate key |
| Create | `INSERT` | Write |
| Update (rating, title, etc.) | `UPDATE ... WHERE Id = @id AND RowVersion = @version` | Conditional write (optimistic concurrency) |

### Game Queries
| Operation | Current SQL Pattern | Access Pattern |
|-----------|-------------------|----------------|
| Get by ID (with Player) | `SELECT + JOIN Player WHERE Id = @id` | Point read + related entity |
| List by player (paginated) | `WHERE PlayerId = @id ORDER BY PlayedAt DESC SKIP/TAKE` | Range query: player + time (descending), pagination |
| Count by player | `COUNT(*) WHERE PlayerId = @id` | Aggregate: count items for a player |
| Session cap check | `SUM(EloChange) WHERE PlayerId = @id AND PlayedAt >= cutoff AND EloChange > 0` | **Aggregate**: sum of positive EloChange in 24hr window |
| Create | `INSERT` | Write |
| Update accuracy | `UPDATE AccuracyPlayer WHERE Id = @id` | Point update |

### RatingHistory Queries
| Operation | Current SQL Pattern | Access Pattern |
|-----------|-------------------|----------------|
| List by player (optional TC filter, limit N, chronological) | `WHERE PlayerId = @id [AND TimeControl = @tc] ORDER BY RecordedAt DESC TAKE(N) then reverse` | Range query: player + time, optional filter |
| Create | `INSERT` | Write |

### Leaderboard Query
| Operation | Current SQL Pattern | Access Pattern |
|-----------|-------------------|----------------|
| Top 100 by rating for TC | `WHERE GamesPlayed > 0 ORDER BY Rating DESC TAKE(100)` | **Global scan + sort** — currently no index, full table scan |

### Refresh Token Queries
| Operation | Current SQL Pattern | Access Pattern |
|-----------|-------------------|----------------|
| Get by token hash | `WHERE TokenHash = @hash` | Point read by unique key |
| Revoke (set RevokedAt) | `UPDATE WHERE Id = @id` | Point update |
| Cleanup expired/revoked | `DELETE WHERE ExpiresAt < now OR RevokedAt != null` | Batch delete by condition |

### EloSessionCap Queries
| Operation | Current SQL Pattern | Access Pattern |
|-----------|-------------------|----------------|
| Cleanup stale | `DELETE WHERE Date < today` | Batch delete by date |

## 8.2 Key DynamoDB Migration Concerns

### Session Cap — Most Complex Query
The session cap (`SUM(EloChange) WHERE PlayerId AND PlayedAt >= 24h AND EloChange > 0`) is a conditional aggregation on Games. In DynamoDB:
- **Option A**: Query Games GSI by `(PlayerId, PlayedAt)`, filter `EloChange > 0`, sum client-side
- **Option B**: Maintain a separate counter item updated atomically on each game write
- **Concern**: This query runs on every rated game submission — must be fast

### Leaderboard — Global Sort
The leaderboard needs a global sort by rating. In DynamoDB:
- **Option A**: GSI with partition key = time control, sort key = rating (inverted or zero-padded)
- **Option B**: Precomputed leaderboard items updated on game submission
- Current caching (15min HybridCache) helps — leaderboard can be eventually consistent

### PlayerStats — Full Scan per Player
`PlayerStatsQuery` fetches ALL game results for a player. In DynamoDB:
- Query on `(PlayerId, PlayedAt)` returns all games — same pattern works
- In-memory stats computation stays the same
- Consider denormalizing win/loss/draw/streak counters on the Player item

### Transaction Scope
`GameResultService` uses `IUnitOfWork` for atomicity across Player update + Game insert + RatingHistory insert. DynamoDB `TransactWriteItems` supports up to 100 items in a single transaction — sufficient for this use case (3 items per game).

### Optimistic Concurrency
Player uses `RowVersion` in PostgreSQL. DynamoDB equivalent: condition expression on a version attribute (`attribute_not_exists(version) OR version = :expected`).

### Identity Tables
ASP.NET Identity creates 7 tables (AspNetUsers, AspNetRoles, etc.). These would need to either:
- Stay in a relational database (RDS/Aurora) alongside Identity
- Be replaced with a custom Cognito or JWT-only auth implementation
- Be mapped to DynamoDB with a custom Identity store

### Entities in Infrastructure Layer
`RefreshToken` and `EloSessionCap` are defined in `ChessArena.Infrastructure.Data.Entities`, NOT in `ChessArena.Core.Entities`. This means:
- They are tightly coupled to the infrastructure layer
- Migration would replace these entirely with DynamoDB-native implementations
- Core entities (`Player`, `Game`, `RatingHistory`) would need new repository implementations

## 8.3 Suggested DynamoDB Single-Table Design

```
PK                          SK                          Entity
────                        ──                          ──────
PLAYER#{id}                 PROFILE                     Player profile + ratings + stats
PLAYER#{id}                 GAME#{playedAt}#{gameId}    Game record (sorted by time)
PLAYER#{id}                 RATING#{tc}#{recordedAt}    Rating history entry
USER#{appUserId}            PLAYER                      User → Player mapping
USERNAME#{username}         PLAYER                      Username → Player mapping
TOKEN#{tokenHash}           REFRESH                     Refresh token

GSI1 (Leaderboard):
  GSI1PK = TC#{timeControl}
  GSI1SK = RATING#{zeroPadded}#{playerId}
```

This design supports all current access patterns with single-table queries.
