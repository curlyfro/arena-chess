using ChessArena.Application.DTOs.Players;
using ChessArena.Core.Enums;

namespace ChessArena.Application.Services;

public static class PlayerStatsCalculator
{
    public static PlayerStatsResponse Compute(IReadOnlyList<GameResult> results)
    {
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
