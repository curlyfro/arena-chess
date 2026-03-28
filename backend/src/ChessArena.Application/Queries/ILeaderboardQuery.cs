using ChessArena.Application.DTOs.Leaderboard;
using ChessArena.Core.Enums;

namespace ChessArena.Application.Queries;

public interface ILeaderboardQuery
{
    Task<List<LeaderboardEntryResponse>> GetTopPlayersAsync(
        TimeControl tc, int limit = 100, CancellationToken ct = default);
}
