using ChessArena.Application.DTOs.Games;
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
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> SubmitGame(
        [FromBody] SubmitGameRequest request,
        CancellationToken ct)
    {
        var player = await playerRepository.GetByApplicationUserIdAsync(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "", ct);

        if (player == null)
            return Unauthorized();

        // Parse enums at the API boundary
        var submission = new GameSubmission(
            request.AiLevel,
            Enum.Parse<TimeControl>(request.TimeControl, ignoreCase: true),
            request.IsRated,
            Enum.Parse<GameResult>(request.Result, ignoreCase: true),
            TerminationParser.Parse(request.Termination),
            Enum.Parse<PlayerColor>(request.PlayerColor, ignoreCase: true),
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
