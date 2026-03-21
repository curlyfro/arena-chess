using ChessArena.Core.Enums;

namespace ChessArena.Core.Entities;

public class Player
{
    public Guid Id { get; set; }
    public string Username { get; set; } = default!;
    public string ApplicationUserId { get; set; } = default!;

    // Ratings per time control
    public int EloBullet { get; set; } = 1200;
    public int EloBlitz { get; set; } = 1200;
    public int EloRapid { get; set; } = 1200;

    // Rating Deviation
    public int RdBullet { get; set; } = 350;
    public int RdBlitz { get; set; } = 350;
    public int RdRapid { get; set; } = 350;

    // Games played (for K-factor provisioning)
    public int GamesBullet { get; set; }
    public int GamesBlitz { get; set; }
    public int GamesRapid { get; set; }

    // Peak ratings (for title awards)
    public int PeakEloBullet { get; set; } = 1200;
    public int PeakEloBlitz { get; set; } = 1200;
    public int PeakEloRapid { get; set; } = 1200;

    public PlayerTitle Title { get; set; } = PlayerTitle.Beginner;
    public DateTime CreatedAt { get; set; }
    public DateTime LastActiveAt { get; set; }

    // Optimistic concurrency
    public uint RowVersion { get; set; }

    public int OverallPeakElo => Math.Max(PeakEloBullet, Math.Max(PeakEloBlitz, PeakEloRapid));

    public ICollection<Game> Games { get; set; } = [];
    public ICollection<RatingHistory> RatingHistories { get; set; } = [];

    // ── Per-time-control accessors ──

    public int GetRating(TimeControl tc) => tc switch
    {
        TimeControl.Bullet => EloBullet,
        TimeControl.Blitz => EloBlitz,
        TimeControl.Rapid => EloRapid,
        _ => EloBlitz
    };

    public void SetRating(TimeControl tc, int rating)
    {
        switch (tc)
        {
            case TimeControl.Bullet: EloBullet = rating; break;
            case TimeControl.Blitz: EloBlitz = rating; break;
            case TimeControl.Rapid: EloRapid = rating; break;
        }
    }

    public int GetGamesPlayed(TimeControl tc) => tc switch
    {
        TimeControl.Bullet => GamesBullet,
        TimeControl.Blitz => GamesBlitz,
        TimeControl.Rapid => GamesRapid,
        _ => GamesBlitz
    };

    public void IncrementGamesPlayed(TimeControl tc)
    {
        switch (tc)
        {
            case TimeControl.Bullet: GamesBullet++; break;
            case TimeControl.Blitz: GamesBlitz++; break;
            case TimeControl.Rapid: GamesRapid++; break;
        }
    }

    public int GetPeakElo(TimeControl tc) => tc switch
    {
        TimeControl.Bullet => PeakEloBullet,
        TimeControl.Blitz => PeakEloBlitz,
        TimeControl.Rapid => PeakEloRapid,
        _ => PeakEloBlitz
    };

    public void SetPeakElo(TimeControl tc, int rating)
    {
        switch (tc)
        {
            case TimeControl.Bullet: PeakEloBullet = rating; break;
            case TimeControl.Blitz: PeakEloBlitz = rating; break;
            case TimeControl.Rapid: PeakEloRapid = rating; break;
        }
    }

    public int GetRd(TimeControl tc) => tc switch
    {
        TimeControl.Bullet => RdBullet,
        TimeControl.Blitz => RdBlitz,
        TimeControl.Rapid => RdRapid,
        _ => RdBlitz
    };

    public void SetRd(TimeControl tc, int rd)
    {
        switch (tc)
        {
            case TimeControl.Bullet: RdBullet = rd; break;
            case TimeControl.Blitz: RdBlitz = rd; break;
            case TimeControl.Rapid: RdRapid = rd; break;
        }
    }
}
