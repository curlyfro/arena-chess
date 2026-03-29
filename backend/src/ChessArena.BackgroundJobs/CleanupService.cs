using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ChessArena.BackgroundJobs;

/// <summary>
/// Periodic cleanup service. With DynamoDB, token expiry is handled by TTL
/// and EloSessionCap has been eliminated. This service is retained as a
/// placeholder for future cleanup tasks.
/// </summary>
public class CleanupService(ILogger<CleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("CleanupService started — running every {Interval}", Interval);

        using var timer = new PeriodicTimer(Interval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            logger.LogDebug("CleanupService tick — no cleanup tasks configured");
        }

        logger.LogInformation("CleanupService stopped");
    }
}
