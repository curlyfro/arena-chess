using ChessArena.Core.Enums;

namespace ChessArena.Core.Entities;

public class RatingHistory
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public Player Player { get; set; } = default!;
    public Guid GameId { get; set; }
    public Game Game { get; set; } = default!;

    public TimeControl TimeControl { get; set; }
    public int Rating { get; set; }
    public int RatingDeviation { get; set; }
    public DateTime RecordedAt { get; set; }
}
