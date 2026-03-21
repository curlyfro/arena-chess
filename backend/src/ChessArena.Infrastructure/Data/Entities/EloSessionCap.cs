namespace ChessArena.Infrastructure.Data.Entities;

public class EloSessionCap
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public DateOnly Date { get; set; }
    public int TotalDelta { get; set; }
}
