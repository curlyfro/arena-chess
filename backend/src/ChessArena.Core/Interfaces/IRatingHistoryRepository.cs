using ChessArena.Core.Entities;
using ChessArena.Core.Enums;

namespace ChessArena.Core.Interfaces;

public interface IRatingHistoryRepository
{
    Task<IReadOnlyList<RatingHistory>> GetByPlayerIdAsync(
        Guid playerId,
        TimeControl? timeControl = null,
        int limit = 100,
        CancellationToken ct = default);
    Task AddAsync(RatingHistory entry, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
