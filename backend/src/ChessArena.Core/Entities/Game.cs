using ChessArena.Core.Enums;

namespace ChessArena.Core.Entities;

public class Game
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public Player Player { get; set; } = default!;

    public int AiLevel { get; set; }
    public int AiElo { get; set; }
    public TimeControl TimeControl { get; set; }
    public bool IsRated { get; set; }

    public GameResult Result { get; set; }
    public Termination Termination { get; set; }
    public PlayerColor PlayerColor { get; set; }

    public int EloBefore { get; set; }
    public int EloAfter { get; set; }
    public int EloChange { get; set; }

    public string Pgn { get; set; } = default!;
    public float AccuracyPlayer { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime PlayedAt { get; set; }
}
