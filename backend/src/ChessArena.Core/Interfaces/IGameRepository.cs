using ChessArena.Core.Entities;
using ChessArena.Core.Enums;

namespace ChessArena.Core.Interfaces;

public interface IGameRepository
{
    Task<Game?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Game>> GetByPlayerIdAsync(Guid playerId, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetCountByPlayerIdAsync(Guid playerId, CancellationToken ct = default);
    Task AddAsync(Game game, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
