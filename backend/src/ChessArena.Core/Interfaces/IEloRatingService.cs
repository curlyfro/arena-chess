using ChessArena.Core.Entities;
using ChessArena.Core.Enums;

namespace ChessArena.Core.Interfaces;

public interface IEloRatingService
{
    double ExpectedScore(int playerRating, int opponentRating);
    int GetKFactor(Player player, TimeControl tc);
    int ComputeDelta(int kFactor, double actual, double expected);
    int ApplyLowAiCap(int delta, int aiLevel);
}
