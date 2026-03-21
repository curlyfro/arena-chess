namespace ChessArena.Core.Interfaces;

public interface ISessionCapService
{
    /// <summary>
    /// Atomically checks and increments the daily Elo cap for a player.
    /// Returns true if the delta was applied (under cap), false if cap exceeded.
    /// </summary>
    Task<bool> CheckAndIncrementAsync(Guid playerId, int delta, CancellationToken ct = default);

    /// <summary>
    /// Gets the current session total for display purposes (may be cached).
    /// </summary>
    Task<int> GetCurrentTotalAsync(Guid playerId, CancellationToken ct = default);
}
