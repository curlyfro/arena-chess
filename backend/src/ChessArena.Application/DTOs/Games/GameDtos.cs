namespace ChessArena.Application.DTOs.Games;

public sealed record SubmitGameRequest(
    int AiLevel,
    string TimeControl,
    bool IsRated,
    string Result,
    string Termination,
    string PlayerColor,
    string Pgn,
    float AccuracyPlayer,
    int DurationSeconds
);

public sealed record SubmitGameResponse(
    Guid GameId,
    int EloBefore,
    int EloAfter,
    int EloChange,
    string? NewTitle
);

public sealed record GameDetailResponse(
    Guid Id,
    Guid PlayerId,
    string PlayerUsername,
    int AiLevel,
    int AiElo,
    string TimeControl,
    bool IsRated,
    string Result,
    string Termination,
    string PlayerColor,
    int EloBefore,
    int EloAfter,
    int EloChange,
    string Pgn,
    float AccuracyPlayer,
    int DurationSeconds,
    DateTime PlayedAt
);
