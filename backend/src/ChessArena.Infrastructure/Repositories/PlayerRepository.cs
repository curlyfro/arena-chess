// DEPRECATED: EF/PostgreSQL — replaced by DynamoDb/ implementation. Remove after migration validation.
using ChessArena.Core.Entities;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Repositories;

[Obsolete("EF/PostgreSQL — replaced by DynamoDB. Remove after migration validation.")]
public sealed class PlayerRepository(AppDbContext db) : IPlayerRepository
{
    public async Task<Player?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Players.FindAsync([id], ct);

    public async Task<Player?> GetByUsernameAsync(string username, CancellationToken ct = default)
        => await db.Players.FirstOrDefaultAsync(p => p.Username == username, ct);

    public async Task<Player?> GetByApplicationUserIdAsync(string userId, CancellationToken ct = default)
        => await db.Players.FirstOrDefaultAsync(p => p.ApplicationUserId == userId, ct);

    public async Task AddAsync(Player player, CancellationToken ct = default)
        => await db.Players.AddAsync(player, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
