using ChessArena.Application.DTOs.Players;
using ChessArena.Application.Queries;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/players")]
public class PlayersController(
    IPlayerRepository playerRepository,
    IGameRepository gameRepository,
    IRatingHistoryRepository ratingHistoryRepository,
    IPlayerStatsQuery playerStatsQuery) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProfile(Guid id, CancellationToken ct)
    {
        var player = await playerRepository.GetByIdAsync(id, ct);
        if (player == null)
            return NotFound();

        var stats = await playerStatsQuery.GetAsync(id, ct);

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
        TimeControl? tc = null;
        if (timeControl != null)
        {
            if (!Enum.TryParse<TimeControl>(timeControl, ignoreCase: true, out var parsed))
                return BadRequest(new { Error = "Invalid time control. Valid values: bullet, blitz, rapid." });
            tc = parsed;
        }

        var history = await ratingHistoryRepository.GetByPlayerIdAsync(id, tc, limit, ct);

        return Ok(history.Select(rh => new RatingHistoryResponse(
            rh.TimeControl.ToString(),
            rh.Rating,
            rh.RatingDeviation,
            rh.RecordedAt)));
    }
}
