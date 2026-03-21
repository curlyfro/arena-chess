namespace ChessArena.Core.Interfaces;

public interface IRatingDecayService
{
    Task ProcessDecayAsync(CancellationToken ct = default);
}
