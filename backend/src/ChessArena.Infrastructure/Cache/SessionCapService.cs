// DEPRECATED: EF/PostgreSQL — replaced by DynamoDb/ implementation. Remove after migration validation.
using ChessArena.Core.Constants;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Cache;

/// <summary>
/// Enforces a rolling 24-hour cap on ELO gains by querying recent game results.
/// </summary>
[Obsolete("EF/PostgreSQL — replaced by DynamoDB. Remove after migration validation.")]
public sealed class SessionCapService(AppDbContext db) : ISessionCapService
{
    public async Task<bool> CheckAndIncrementAsync(
        Guid playerId, int delta, CancellationToken ct = default)
    {
        // Note: "Increment" is now implicit — the Game record's EloChange column
        // serves as the increment when it's inserted by GameResultService.
        var currentTotal = await GetCurrentTotalAsync(playerId, ct);
        return currentTotal + delta <= RatingConstants.SessionCapMax;
    }

    public async Task<int> GetCurrentTotalAsync(Guid playerId, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);
        return await db.Games
            .Where(g => g.PlayerId == playerId && g.PlayedAt >= cutoff && g.EloChange > 0)
            .SumAsync(g => g.EloChange, ct);
    }
}
