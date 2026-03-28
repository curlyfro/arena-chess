namespace ChessArena.Application.DTOs.Players;

public sealed record PlayerProfileResponse(
    Guid Id,
    string Username,
    string Title,
    int EloBullet,
    int EloBlitz,
    int EloRapid,
    int RdBullet,
    int RdBlitz,
    int RdRapid,
    PlayerStatsResponse Stats,
    DateTime CreatedAt,
    DateTime LastActiveAt
);

public sealed record PlayerStatsResponse(
    int TotalGames,
    int Wins,
    int Losses,
    int Draws,
    double WinRate,
    int CurrentStreak,
    int LongestStreak
);

public sealed record RatingHistoryResponse(
    string TimeControl,
    int Rating,
    int RatingDeviation,
    DateTime RecordedAt
);
