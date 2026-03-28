using ChessArena.Application.Queries;
using ChessArena.Core.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Hybrid;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/leaderboard")]
public class LeaderboardController(ILeaderboardQuery leaderboardQuery, HybridCache cache) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] string timeControl = "blitz",
        CancellationToken ct = default)
    {
        if (!Enum.TryParse<TimeControl>(timeControl, ignoreCase: true, out var tc))
            return BadRequest(new { Error = "Invalid time control. Valid values: bullet, blitz, rapid." });

        var cacheKey = $"leaderboard:{tc}";

        var entries = await cache.GetOrCreateAsync(
            cacheKey,
            async cancel => await leaderboardQuery.GetTopPlayersAsync(tc, 100, cancel),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(15),
                LocalCacheExpiration = TimeSpan.FromMinutes(5)
            },
            tags: [$"leaderboard:{tc}"],
            cancellationToken: ct);

        return Ok(entries);
    }
}
