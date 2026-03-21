using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChessArena.Application.DTOs.Auth;
using ChessArena.Core.Entities;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;

namespace ChessArena.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IPlayerRepository playerRepository,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken ct)
    {
        var user = new ApplicationUser
        {
            UserName = request.Username,
            Email = request.Email,
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { Errors = result.Errors.Select(e => e.Description) });

        // Create the Player entity
        var player = new Player
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            ApplicationUserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
        };

        user.PlayerId = player.Id;
        await playerRepository.AddAsync(player, ct);
        await playerRepository.SaveChangesAsync(ct);
        await userManager.UpdateAsync(user);

        var token = GenerateJwtToken(user, player);

        return Ok(new AuthResponse(token, DateTime.UtcNow.AddMinutes(60)));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { Error = "Invalid email or password" });

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded)
            return Unauthorized(new { Error = "Invalid email or password" });

        var player = await playerRepository.GetByApplicationUserIdAsync(user.Id);
        if (player == null)
            return Unauthorized(new { Error = "Player profile not found" });

        var token = GenerateJwtToken(user, player);

        return Ok(new AuthResponse(token, DateTime.UtcNow.AddMinutes(60)));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return Unauthorized();

        var player = await playerRepository.GetByApplicationUserIdAsync(userId);

        return Ok(new UserProfileResponse(
            player?.Id ?? Guid.Empty,
            user.UserName ?? "",
            user.Email ?? "",
            user.EmailConfirmed
        ));
    }

    private string GenerateJwtToken(ApplicationUser user, Player player)
    {
        var key = configuration["Jwt:Key"] ?? "ChessArena-Dev-Secret-Key-Min-32-Chars!!";
        var issuer = configuration["Jwt:Issuer"] ?? "ChessArena";
        var audience = configuration["Jwt:Audience"] ?? "ChessArena";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? ""),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim("playerId", player.Id.ToString()),
        };

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
