using ChessArena.Application.DTOs.Players;
using ChessArena.Application.Queries;
using ChessArena.Core.Enums;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Queries;

public sealed class PlayerStatsQuery(AppDbContext db) : IPlayerStatsQuery
{
    public async Task<PlayerStatsResponse> GetAsync(Guid playerId, CancellationToken ct = default)
    {
        // Single query: fetch ordered results for both counts and streak calculation
        var results = await db.Games
            .Where(g => g.PlayerId == playerId)
            .OrderBy(g => g.PlayedAt)
            .Select(g => g.Result)
            .ToListAsync(ct);

        if (results.Count == 0)
            return new PlayerStatsResponse(0, 0, 0, 0, 0, 0, 0);

        int wins = 0, losses = 0, draws = 0;
        int longestStreak = 0, streak = 0;

        foreach (var result in results)
        {
            switch (result)
            {
                case GameResult.Win: wins++; break;
                case GameResult.Loss: losses++; break;
                case GameResult.Draw: draws++; break;
            }

            if (result == GameResult.Win)
            {
                streak++;
                longestStreak = Math.Max(longestStreak, streak);
            }
            else
            {
                streak = 0;
            }
        }

        double winRate = (double)wins / results.Count * 100;

        return new PlayerStatsResponse(
            results.Count, wins, losses, draws,
            winRate, streak, longestStreak);
    }
}
