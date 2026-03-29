using System.Security.Claims;
using System.Text.Json;
using ChessArena.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/preferences")]
[Authorize]
public class PreferencesController(
    IPreferencesRepository preferencesRepository,
    IPlayerRepository playerRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var playerId = await GetPlayerIdAsync(ct);
        if (playerId == null)
            return Unauthorized();

        var (json, version) = await preferencesRepository.GetAsync(playerId.Value, ct);

        return Ok(new
        {
            Data = json != null ? JsonSerializer.Deserialize<JsonElement>(json) : (JsonElement?)null,
            Version = version,
        });
    }

    [HttpPut]
    public async Task<IActionResult> Save(
        [FromBody] SavePreferencesRequest request,
        CancellationToken ct)
    {
        var playerId = await GetPlayerIdAsync(ct);
        if (playerId == null)
            return Unauthorized();

        var json = request.Data.GetRawText();

        if (json.Length > 256 * 1024)
            return BadRequest(new { Error = "Preferences data exceeds 256KB limit." });

        try
        {
            await preferencesRepository.SaveAsync(playerId.Value, json, request.Version, ct);
            return NoContent();
        }
        catch (Amazon.DynamoDBv2.Model.ConditionalCheckFailedException)
        {
            return Conflict(new { Error = "Version conflict. Re-fetch and retry." });
        }
    }

    private async Task<Guid?> GetPlayerIdAsync(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return null;

        var player = await playerRepository.GetByApplicationUserIdAsync(userId, ct);
        return player?.Id;
    }
}

public record SavePreferencesRequest(JsonElement Data, int Version);
