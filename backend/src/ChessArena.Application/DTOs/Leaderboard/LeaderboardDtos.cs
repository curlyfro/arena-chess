namespace ChessArena.Application.DTOs.Leaderboard;

public sealed record LeaderboardEntryResponse(
    int Rank,
    Guid PlayerId,
    string Username,
    string Title,
    int Rating,
    int GamesPlayed
);
