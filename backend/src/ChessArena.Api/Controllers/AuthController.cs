using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ChessArena.Application.DTOs.Auth;
using ChessArena.Core.Entities;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Data.Entities;
using ChessArena.Infrastructure.Auth;
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
    IUnitOfWork unitOfWork,
    IConfiguration configuration,
    IRefreshTokenStore refreshTokenStore) : ControllerBase
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

        try
        {
            await unitOfWork.BeginTransactionAsync(ct);

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

            await unitOfWork.CommitAsync(ct);

            var accessToken = GenerateJwtToken(user, player);
            var refreshToken = await CreateRefreshTokenAsync(user.Id, ct);
            return Ok(new AuthResponse(accessToken, refreshToken, DateTime.UtcNow.AddMinutes(60)));
        }
        catch
        {
            try { await userManager.DeleteAsync(user); }
            catch { /* cleanup is best-effort */ }
            throw;
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { Error = "Invalid email or password" });

        if (await userManager.IsLockedOutAsync(user))
            return Unauthorized(new { Error = "Account is temporarily locked. Try again later." });

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, true);
        if (!result.Succeeded)
            return Unauthorized(new { Error = "Invalid email or password" });

        var player = await playerRepository.GetByApplicationUserIdAsync(user.Id);
        if (player == null)
            return Unauthorized(new { Error = "Player profile not found" });

        var accessToken = GenerateJwtToken(user, player);
        var refreshToken = await CreateRefreshTokenAsync(user.Id, ct);

        return Ok(new AuthResponse(accessToken, refreshToken, DateTime.UtcNow.AddMinutes(60)));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshRequest request,
        CancellationToken ct)
    {
        var tokenHash = HashToken(request.RefreshToken);
        var storedToken = await refreshTokenStore.GetByTokenHashAsync(tokenHash, ct);

        if (storedToken == null || !storedToken.IsActive)
            return Unauthorized(new { Error = "Invalid or expired refresh token" });

        // Revoke the used token (rotation)
        storedToken.RevokedAt = DateTime.UtcNow;
        await refreshTokenStore.AddAsync(storedToken, ct);
        await refreshTokenStore.SaveChangesAsync(ct);

        var user = await userManager.FindByIdAsync(storedToken.UserId);
        if (user == null)
            return Unauthorized(new { Error = "User not found" });

        var player = await playerRepository.GetByApplicationUserIdAsync(user.Id);
        if (player == null)
            return Unauthorized(new { Error = "Player profile not found" });

        var accessToken = GenerateJwtToken(user, player);
        var refreshToken = await CreateRefreshTokenAsync(user.Id, ct);

        return Ok(new AuthResponse(accessToken, refreshToken, DateTime.UtcNow.AddMinutes(60)));
    }

    [HttpPost("revoke")]
    public async Task<IActionResult> Revoke(
        [FromBody] RevokeRequest request,
        CancellationToken ct)
    {
        var tokenHash = HashToken(request.RefreshToken);
        var storedToken = await refreshTokenStore.GetByTokenHashAsync(tokenHash, ct);

        if (storedToken is { IsActive: true })
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await refreshTokenStore.AddAsync(storedToken, ct);
            await refreshTokenStore.SaveChangesAsync(ct);
        }

        return NoContent();
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

    private async Task<string> CreateRefreshTokenAsync(string userId, CancellationToken ct)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var tokenHash = HashToken(rawToken);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
        };

        await refreshTokenStore.AddAsync(refreshToken, ct);
        await refreshTokenStore.SaveChangesAsync(ct);

        return rawToken;
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
