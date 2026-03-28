using ChessArena.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ChessArena.BackgroundJobs;

public class CleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<CleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("CleanupService started — running every {Interval}", Interval);

        using var timer = new PeriodicTimer(Interval);

        // Run immediately on startup, then on each tick
        do
        {
            try
            {
                await RunCleanupAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "CleanupService encountered an error");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));

        logger.LogInformation("CleanupService stopped");
    }

    private async Task RunCleanupAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var staleCaps = await CleanupStaleSessionCapsAsync(db, ct);
        var expiredTokens = await CleanupExpiredRefreshTokensAsync(db, ct);

        logger.LogInformation(
            "Cleanup complete — removed {StaleCaps} stale session caps, {ExpiredTokens} expired/revoked refresh tokens",
            staleCaps,
            expiredTokens);
    }

    private static async Task<int> CleanupStaleSessionCapsAsync(AppDbContext db, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        return await db.EloSessionCaps
            .Where(c => c.Date < today)
            .ExecuteDeleteAsync(ct);
    }

    private static async Task<int> CleanupExpiredRefreshTokensAsync(AppDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        return await db.RefreshTokens
            .Where(t => t.ExpiresAt < now || t.RevokedAt != null)
            .ExecuteDeleteAsync(ct);
    }
}
