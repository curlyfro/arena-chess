using ChessArena.Application.DTOs.Leaderboard;
using ChessArena.Core.Enums;
using ChessArena.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/leaderboard")]
public class LeaderboardController(AppDbContext db, HybridCache cache) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] string timeControl = "blitz",
        CancellationToken ct = default)
    {
        var tc = Enum.Parse<TimeControl>(timeControl, ignoreCase: true);
        var cacheKey = $"leaderboard:{tc}";

        var entries = await cache.GetOrCreateAsync(
            cacheKey,
            async cancel => await BuildLeaderboard(tc, cancel),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(15),
                LocalCacheExpiration = TimeSpan.FromMinutes(5)
            },
            tags: [$"leaderboard:{tc}"],
            cancellationToken: ct);

        return Ok(entries);
    }

    private async Task<List<LeaderboardEntryResponse>> BuildLeaderboard(
        TimeControl tc, CancellationToken ct)
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
            .Take(100);

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
