using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Repositories;

public sealed class RatingHistoryRepository(AppDbContext db) : IRatingHistoryRepository
{
    public async Task<IReadOnlyList<RatingHistory>> GetByPlayerIdAsync(
        Guid playerId, TimeControl? timeControl = null, int limit = 100, CancellationToken ct = default)
    {
        var query = db.RatingHistories
            .Where(rh => rh.PlayerId == playerId);

        if (timeControl.HasValue)
            query = query.Where(rh => rh.TimeControl == timeControl.Value);

        return await query
            .OrderByDescending(rh => rh.RecordedAt)
            .Take(limit)
            .OrderBy(rh => rh.RecordedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(RatingHistory entry, CancellationToken ct = default)
        => await db.RatingHistories.AddAsync(entry, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
