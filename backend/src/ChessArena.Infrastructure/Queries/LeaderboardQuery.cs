using ChessArena.Application.DTOs.Leaderboard;
using ChessArena.Application.Queries;
using ChessArena.Core.Enums;
using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Infrastructure.Queries;

public sealed class LeaderboardQuery(AppDbContext db) : ILeaderboardQuery
{
    public async Task<List<LeaderboardEntryResponse>> GetTopPlayersAsync(
        TimeControl tc, int limit = 100, CancellationToken ct = default)
    {
        var query = db.Players
            .Where(p => tc == TimeControl.Bullet ? p.GamesBullet > 0
                : tc == TimeControl.Rapid ? p.GamesRapid > 0
                : p.GamesBlitz > 0)
            .Select(p => new
            {
                p.Id,
                p.Username,
                p.Title,
                Rating = tc == TimeControl.Bullet ? p.EloBullet
                    : tc == TimeControl.Rapid ? p.EloRapid
                    : p.EloBlitz,
                GamesPlayed = tc == TimeControl.Bullet ? p.GamesBullet
                    : tc == TimeControl.Rapid ? p.GamesRapid
                    : p.GamesBlitz
            })
            .OrderByDescending(x => x.Rating)
            .Take(limit);

        var players = await query.ToListAsync(ct);

        return players.Select((p, i) => new LeaderboardEntryResponse(
            i + 1,
            p.Id,
            p.Username,
            p.Title.ToString(),
            p.Rating,
            p.GamesPlayed
        )).ToList();
    }
}
