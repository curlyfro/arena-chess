namespace ChessArena.Core.Interfaces;

public interface IPreferencesRepository
{
    Task<(string? json, int version)> GetAsync(Guid playerId, CancellationToken ct = default);
    Task SaveAsync(Guid playerId, string json, int expectedVersion, CancellationToken ct = default);
}
