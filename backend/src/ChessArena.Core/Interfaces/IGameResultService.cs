using ChessArena.Core.Entities;
using ChessArena.Core.Enums;

namespace ChessArena.Core.Interfaces;

public interface IGameResultService
{
    Task<Game> ProcessResultAsync(Guid playerId, GameSubmission submission, CancellationToken ct = default);
}

/// <summary>
/// Strongly-typed game submission with parsed enum values.
/// </summary>
public record GameSubmission(
    int AiLevel,
    TimeControl TimeControl,
    bool IsRated,
    GameResult Result,
    Termination Termination,
    PlayerColor PlayerColor,
    string Pgn,
    float AccuracyPlayer,
    int DurationSeconds
);
