namespace ChessArena.Core.Constants;

public static class RatingConstants
{
    public const int RatingFloor = 1000;
    public const int DefaultRating = 1200;
    public const int DefaultRd = 350;
    public const int MinRd = 50;
    public const int MaxRd = 350;

    /// <summary>AI levels 1-3 have a ±20 Elo cap per game.</summary>
    public const int LowAiCapLevel = 3;
    public const int LowAiCapDelta = 20;

    /// <summary>Maximum +80 Elo per player per 24-hour rolling window.</summary>
    public const int SessionCapMax = 80;

    public const int RdDecayPerWeek = 5;
    public const int RdReductionPerGame = 2;

    // K-factor thresholds
    public const int NewPlayerGameThreshold = 30;
    public const int NewPlayerKFactor = 40;
    public const int StandardKFactor = 20;
    public const int EliteRatingThreshold = 2400;
    public const int EliteKFactor = 10;
}
