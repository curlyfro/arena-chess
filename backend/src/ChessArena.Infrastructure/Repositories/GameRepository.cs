using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Repositories;

public sealed class GameRepository(AppDbContext db) : IGameRepository
{
    public async Task<Game?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Games
            .Include(g => g.Player)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task<IReadOnlyList<Game>> GetByPlayerIdAsync(
        Guid playerId, int page, int pageSize, CancellationToken ct = default)
        => await db.Games
            .Where(g => g.PlayerId == playerId)
            .OrderByDescending(g => g.PlayedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

    public async Task<int> GetCountByPlayerIdAsync(Guid playerId, CancellationToken ct = default)
        => await db.Games.CountAsync(g => g.PlayerId == playerId, ct);

    public async Task AddAsync(Game game, CancellationToken ct = default)
        => await db.Games.AddAsync(game, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
