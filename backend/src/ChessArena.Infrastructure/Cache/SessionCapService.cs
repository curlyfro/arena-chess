using ChessArena.Core.Constants;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Cache;

public sealed class SessionCapService(AppDbContext db) : ISessionCapService
{
    public async Task<bool> CheckAndIncrementAsync(
        Guid playerId, int delta, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Ensure row exists (atomic upsert, no TOCTOU race)
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO "EloSessionCaps" ("Id", "PlayerId", "Date", "TotalDelta")
            VALUES ({Guid.NewGuid()}, {playerId}, {today}, 0)
            ON CONFLICT ("PlayerId", "Date") DO NOTHING
            """, ct);

        // Atomic conditional increment
        int rowsAffected = await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE "EloSessionCaps"
            SET "TotalDelta" = "TotalDelta" + {delta}
            WHERE "PlayerId" = {playerId} AND "Date" = {today}
              AND "TotalDelta" + {delta} <= {RatingConstants.SessionCapMax}
            """, ct);

        return rowsAffected > 0;
    }

    public async Task<int> GetCurrentTotalAsync(Guid playerId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var entry = await db.EloSessionCaps
            .FirstOrDefaultAsync(e => e.PlayerId == playerId && e.Date == today, ct);
        return entry?.TotalDelta ?? 0;
    }
}
