using ChessArena.Application.DTOs.Players;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/players")]
public class PlayersController(
    IPlayerRepository playerRepository,
    IGameRepository gameRepository,
    IRatingHistoryRepository ratingHistoryRepository,
    AppDbContext db) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProfile(Guid id, CancellationToken ct)
    {
        var player = await playerRepository.GetByIdAsync(id, ct);
        if (player == null)
            return NotFound();

        var stats = await ComputeStatsFromDb(id, ct);

        return Ok(new PlayerProfileResponse(
            player.Id,
            player.Username,
            player.Title.ToString(),
            player.EloBullet,
            player.EloBlitz,
            player.EloRapid,
            player.RdBullet,
            player.RdBlitz,
            player.RdRapid,
            stats,
            player.CreatedAt,
            player.LastActiveAt));
    }

    [HttpGet("{id:guid}/games")]
    public async Task<IActionResult> GetGames(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var games = await gameRepository.GetByPlayerIdAsync(id, page, pageSize, ct);
        var total = await gameRepository.GetCountByPlayerIdAsync(id, ct);

        return Ok(new
        {
            Data = games.Select(g => new
            {
                g.Id,
                g.AiLevel,
                g.AiElo,
                TimeControl = g.TimeControl.ToString(),
                g.IsRated,
                Result = g.Result.ToString(),
                g.EloChange,
                g.PlayedAt
            }),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("{id:guid}/rating-history")]
    public async Task<IActionResult> GetRatingHistory(
        Guid id,
        [FromQuery] string? timeControl = null,
        [FromQuery] int limit = 100,
        CancellationToken ct = default)
    {
        TimeControl? tc = timeControl != null
            ? Enum.Parse<TimeControl>(timeControl, ignoreCase: true)
            : null;

        var history = await ratingHistoryRepository.GetByPlayerIdAsync(id, tc, limit, ct);

        return Ok(history.Select(rh => new RatingHistoryResponse(
            rh.TimeControl.ToString(),
            rh.Rating,
            rh.RatingDeviation,
            rh.RecordedAt)));
    }

    /// <summary>
    /// Compute player stats via aggregate DB queries — no full game materialization.
    /// </summary>
    private async Task<PlayerStatsResponse> ComputeStatsFromDb(Guid playerId, CancellationToken ct)
    {
        var counts = await db.Games
            .Where(g => g.PlayerId == playerId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Wins = g.Count(x => x.Result == GameResult.Win),
                Losses = g.Count(x => x.Result == GameResult.Loss),
                Draws = g.Count(x => x.Result == GameResult.Draw)
            })
            .FirstOrDefaultAsync(ct);

        if (counts == null || counts.Total == 0)
            return new PlayerStatsResponse(0, 0, 0, 0, 0, 0, 0);

        double winRate = (double)counts.Wins / counts.Total * 100;

        // Compute streaks via a lightweight projection (only Result + PlayedAt, no PGN)
        var results = await db.Games
            .Where(g => g.PlayerId == playerId)
            .OrderBy(g => g.PlayedAt)
            .Select(g => g.Result)
            .ToListAsync(ct);

        int currentStreak = 0;
        int longestStreak = 0;
        int streak = 0;

        foreach (var result in results)
        {
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
        currentStreak = streak;

        return new PlayerStatsResponse(
            counts.Total, counts.Wins, counts.Losses, counts.Draws,
            winRate, currentStreak, longestStreak);
    }
}
