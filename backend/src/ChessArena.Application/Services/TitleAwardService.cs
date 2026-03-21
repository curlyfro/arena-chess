using ChessArena.Core.Entities;
using ChessArena.Core.Enums;

namespace ChessArena.Application.Services;

public sealed class TitleAwardService
{
    private static readonly (int Threshold, PlayerTitle Title)[] TitleThresholds =
    [
        (2400, PlayerTitle.Grandmaster),
        (2200, PlayerTitle.Master),
        (2000, PlayerTitle.CandidateMaster),
        (1800, PlayerTitle.Expert),
        (1600, PlayerTitle.Advanced),
        (1400, PlayerTitle.Intermediate),
        (1200, PlayerTitle.ClubPlayer),
    ];

    /// <summary>
    /// Check if the player has earned a new title based on peak rating.
    /// Titles are never revoked — only awarded when a higher threshold is crossed.
    /// </summary>
    public PlayerTitle DetermineTitle(Player player)
    {
        int peakAcrossAll = player.OverallPeakElo;

        foreach (var (threshold, title) in TitleThresholds)
        {
            if (peakAcrossAll >= threshold)
                return title;
        }

        return PlayerTitle.Beginner;
    }

    /// <summary>
    /// Updates the player's title if they qualify for a higher one.
    /// Returns true if the title was upgraded.
    /// </summary>
    public bool TryUpgradeTitle(Player player)
    {
        var newTitle = DetermineTitle(player);
        if (newTitle > player.Title)
        {
            player.Title = newTitle;
            return true;
        }
        return false;
    }
}
