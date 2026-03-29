using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Enums;

namespace ChessArena.Infrastructure.DynamoDb;

/// <summary>
/// Builds PK/SK strings for the chess-arena single-table design.
/// All methods are pure functions with no I/O.
/// </summary>
public static class KeyHelpers
{
    // ── Player ──

    public static string PlayerPk(Guid playerId) =>
        $"{DynamoConstants.PlayerPrefix}{playerId}";

    // ── User (Identity) ──

    public static string UserPk(string applicationUserId) =>
        $"{DynamoConstants.UserPrefix}{applicationUserId}";

    public static string UsernamePk(string username) =>
        $"{DynamoConstants.UsernamePrefix}{username}";

    public static string EmailPk(string normalizedEmail) =>
        $"{DynamoConstants.EmailPrefix}{normalizedEmail}";

    // ── Game ──

    public static string GamePk(Guid gameId) =>
        $"{DynamoConstants.GamePrefix}{gameId}";

    /// <summary>
    /// GAME#2026-03-29T12:00:00.0000000Z#&lt;gameId&gt; — ISO 8601 ensures chronological sort.
    /// </summary>
    public static string GameSk(DateTime playedAt, Guid gameId) =>
        $"{DynamoConstants.GamePrefix}{playedAt:O}#{gameId}";

    public static string GameSkLowerBound(DateTime from) =>
        $"{DynamoConstants.GamePrefix}{from:O}";

    /// <summary>
    /// Tilde (~) as suffix ensures all items at or before this time are included in a range query.
    /// </summary>
    public static string GameSkUpperBound(DateTime to) =>
        $"{DynamoConstants.GamePrefix}{to:O}~";

    // ── Rating History ──

    /// <summary>
    /// RATING#Blitz#2026-03-29T12:00:00.0000000Z#&lt;id&gt; — SK prefix enables filtering by time control.
    /// </summary>
    public static string RatingSk(TimeControl tc, DateTime recordedAt, Guid id) =>
        $"{DynamoConstants.RatingPrefix}{tc}#{recordedAt:O}#{id}";

    public static string RatingSkPrefix(TimeControl tc) =>
        $"{DynamoConstants.RatingPrefix}{tc}#";

    // ── Leaderboard ──

    public static string LeaderboardSk(TimeControl tc) =>
        $"{DynamoConstants.LeaderboardItemPrefix}{tc}";

    public static string LeaderboardGsi1Pk(TimeControl tc) =>
        $"{DynamoConstants.LeaderboardPrefix}{tc}";

    /// <summary>
    /// Inverted rating (4 digits) + player ID. Ascending DynamoDB sort = descending rating.
    /// Example: rating 1500 → "8499#&lt;playerId&gt;"
    /// </summary>
    public static string LeaderboardGsi1Sk(int rating, Guid playerId) =>
        $"{InvertedRating(rating)}#{playerId}";

    /// <summary>
    /// 9999 - rating, zero-padded to 4 digits, for descending sort in ascending key order.
    /// </summary>
    public static string InvertedRating(int rating) =>
        (9999 - Math.Clamp(rating, 0, 9999)).ToString("D4");

    // ── Refresh Token ──

    public static string TokenPk(string tokenHash) =>
        $"{DynamoConstants.TokenPrefix}{tokenHash}";

    /// <summary>
    /// Converts a UTC DateTime to Unix epoch seconds for DynamoDB TTL.
    /// </summary>
    public static long ToTtlEpoch(DateTime utcExpiresAt) =>
        new DateTimeOffset(utcExpiresAt, TimeSpan.Zero).ToUnixTimeSeconds();

    // ── Shared helpers ──

    public static Dictionary<string, AttributeValue> Key(string pk, string sk) => new()
    {
        [DynamoConstants.Pk] = new(pk),
        [DynamoConstants.Sk] = new(sk),
    };
}
