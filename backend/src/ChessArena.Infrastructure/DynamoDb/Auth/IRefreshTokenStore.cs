using ChessArena.Infrastructure.Data.Entities;

namespace ChessArena.Infrastructure.Auth;

public interface IRefreshTokenStore
{
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task AddAsync(RefreshToken token, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
