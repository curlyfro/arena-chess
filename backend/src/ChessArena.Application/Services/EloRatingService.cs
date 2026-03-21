using ChessArena.Core.Constants;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Application.Services;

public sealed class EloRatingService : IEloRatingService
{
    /// <summary>
    /// Expected score using FIDE logistic formula (§8).
    /// Rating difference clamped to ±400.
    /// </summary>
    public double ExpectedScore(int playerRating, int opponentRating)
    {
        int diff = Math.Clamp(opponentRating - playerRating, -400, 400);
        return 1.0 / (1.0 + Math.Pow(10.0, diff / 400.0));
    }

    /// <summary>
    /// FIDE three-tier K-factor schedule.
    /// </summary>
    public int GetKFactor(Player player, TimeControl tc)
    {
        int gamesPlayed = player.GetGamesPlayed(tc);
        int rating = player.GetRating(tc);

        if (gamesPlayed < RatingConstants.NewPlayerGameThreshold)
            return RatingConstants.NewPlayerKFactor;

        return rating >= RatingConstants.EliteRatingThreshold
            ? RatingConstants.EliteKFactor
            : RatingConstants.StandardKFactor;
    }

    /// <summary>
    /// Compute signed rating delta. Rounded away from zero per FIDE rules.
    /// </summary>
    public int ComputeDelta(int kFactor, double actual, double expected)
    {
        return (int)Math.Round(
            kFactor * (actual - expected),
            MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Clamp delta to ±20 for games against AI levels 1-3.
    /// </summary>
    public int ApplyLowAiCap(int delta, int aiLevel)
    {
        if (aiLevel <= RatingConstants.LowAiCapLevel)
            return Math.Clamp(delta, -RatingConstants.LowAiCapDelta, RatingConstants.LowAiCapDelta);

        return delta;
    }
}
