namespace ChessArena.Infrastructure.DynamoDb;

/// <summary>
/// Single-table design constants for the chess-arena DynamoDB table.
/// </summary>
public static class DynamoConstants
{
    public const string TableName = "chess-arena";
    public const string Gsi1Name = "GSI1";

    // Key attribute names
    public const string Pk = "PK";
    public const string Sk = "SK";
    public const string Gsi1Pk = "GSI1PK";
    public const string Gsi1Sk = "GSI1SK";
    public const string Ttl = "TTL";

    // Entity prefixes (used in both PK and SK depending on item type)
    public const string PlayerPrefix = "PLAYER#";
    public const string GamePrefix = "GAME#";
    public const string UserPrefix = "USER#";
    public const string UsernamePrefix = "USERNAME#";
    public const string EmailPrefix = "EMAIL#";
    public const string TokenPrefix = "TOKEN#";
    public const string LeaderboardPrefix = "LEADERBOARD#";
    public const string RatingPrefix = "RATING#";
    public const string LeaderboardItemPrefix = "LB#";

    // Fixed SK values
    public const string ProfileSk = "PROFILE";
    public const string LookupSk = "LOOKUP";
    public const string DetailSk = "DETAIL";
    public const string RefreshSk = "REFRESH";
    public const string PlayerLookupSk = "PLAYER_LOOKUP";
    public const string PreferencesSk = "PREFERENCES";

    // Non-key attribute names
    public const string Version = "Version";
    public const string EntityType = "EntityType";

    // EntityType values
    public static class EntityTypes
    {
        public const string Player = "Player";
        public const string Game = "Game";
        public const string RatingHistory = "RatingHistory";
        public const string RefreshToken = "RefreshToken";
        public const string ApplicationUser = "ApplicationUser";
        public const string UsernameLookup = "UsernameLookup";
        public const string EmailLookup = "EmailLookup";
        public const string Leaderboard = "Leaderboard";
        public const string PlayerLookup = "PlayerLookup";
    }
}
