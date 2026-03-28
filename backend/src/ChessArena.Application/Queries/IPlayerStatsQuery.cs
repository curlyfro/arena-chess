using ChessArena.Application.DTOs.Players;

namespace ChessArena.Application.Queries;

public interface IPlayerStatsQuery
{
    Task<PlayerStatsResponse> GetAsync(Guid playerId, CancellationToken ct = default);
}
