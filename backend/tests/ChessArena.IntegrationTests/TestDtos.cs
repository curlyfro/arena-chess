namespace ChessArena.IntegrationTests;

internal record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);

internal record UserProfileResponse(Guid PlayerId, string Username, string Email, bool EmailConfirmed);

internal record GameSubmitResponse(Guid GameId, int EloBefore, int EloAfter, int EloChange, string? NewTitle);

internal record GameDetailResponse(
    Guid Id, Guid PlayerId, string PlayerUsername, int AiLevel, int AiElo,
    string TimeControl, bool IsRated, string Result, string Termination,
    string PlayerColor, int EloBefore, int EloAfter, int EloChange,
    string Pgn, float AccuracyPlayer, int DurationSeconds, DateTime PlayedAt);

internal record LeaderboardEntry(int Rank, string PlayerId, string Username, string Title, int Rating, int GamesPlayed);
