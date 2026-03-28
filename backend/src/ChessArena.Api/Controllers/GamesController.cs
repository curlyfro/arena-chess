using ChessArena.Application.DTOs.Games;
using ChessArena.Core.Entities;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/games")]
[EnableRateLimiting("games")]
public class GamesController(
    IGameResultService gameResultService,
    IGameRepository gameRepository,
    IPlayerRepository playerRepository) : ControllerBase
{
    private async Task<Player?> GetCurrentPlayerAsync(CancellationToken ct)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrEmpty(userId) ? null
            : await playerRepository.GetByApplicationUserIdAsync(userId, ct);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> SubmitGame(
        [FromBody] SubmitGameRequest request,
        CancellationToken ct)
    {
        var player = await GetCurrentPlayerAsync(ct);
        if (player == null)
            return Unauthorized();

        // Parse enums at the API boundary
        if (!Enum.TryParse<TimeControl>(request.TimeControl, ignoreCase: true, out var timeControl))
            return BadRequest(new { Error = "Invalid time control. Valid values: bullet, blitz, rapid, custom." });
        if (!Enum.TryParse<GameResult>(request.Result, ignoreCase: true, out var gameResult))
            return BadRequest(new { Error = "Invalid result. Valid values: win, loss, draw." });
        if (!Enum.TryParse<PlayerColor>(request.PlayerColor, ignoreCase: true, out var playerColor))
            return BadRequest(new { Error = "Invalid player color. Valid values: white, black." });
        if (!TerminationParser.IsValid(request.Termination))
            return BadRequest(new { Error = $"Invalid termination. Valid values: {string.Join(", ", TerminationParser.ValidWireValues)}." });

        var submission = new GameSubmission(
            request.AiLevel,
            timeControl,
            request.IsRated,
            gameResult,
            TerminationParser.Parse(request.Termination),
            playerColor,
            request.Pgn,
            request.AccuracyPlayer,
            request.DurationSeconds);

        var game = await gameResultService.ProcessResultAsync(player.Id, submission, ct);

        return Ok(new SubmitGameResponse(
            game.Id,
            game.EloBefore,
            game.EloAfter,
            game.EloChange,
            game.EloChange != 0 ? player.Title.ToString() : null));
    }

    [HttpPatch("{id:guid}/accuracy")]
    [Authorize]
    public async Task<IActionResult> UpdateAccuracy(
        Guid id,
        [FromBody] UpdateAccuracyRequest request,
        CancellationToken ct)
    {
        var player = await GetCurrentPlayerAsync(ct);
        if (player == null)
            return Unauthorized();

        var game = await gameRepository.GetByIdAsync(id, ct);
        if (game == null)
            return NotFound();

        if (game.PlayerId != player.Id)
            return Forbid();

        game.AccuracyPlayer = request.AccuracyPlayer;
        await gameRepository.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetGame(Guid id, CancellationToken ct)
    {
        var game = await gameRepository.GetByIdAsync(id, ct);
        if (game == null)
            return NotFound();

        return Ok(new GameDetailResponse(
            game.Id,
            game.PlayerId,
            game.Player.Username,
            game.AiLevel,
            game.AiElo,
            game.TimeControl.ToString(),
            game.IsRated,
            game.Result.ToString(),
            game.Termination.ToString(),
            game.PlayerColor.ToString(),
            game.EloBefore,
            game.EloAfter,
            game.EloChange,
            game.Pgn,
            game.AccuracyPlayer,
            game.DurationSeconds,
            game.PlayedAt));
    }
}
