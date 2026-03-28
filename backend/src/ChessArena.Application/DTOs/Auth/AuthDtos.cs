namespace ChessArena.Application.DTOs.Auth;

public sealed record RegisterRequest(
    string Email,
    string Username,
    string Password
);

public sealed record LoginRequest(
    string Email,
    string Password
);

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);

public sealed record RefreshRequest(
    string RefreshToken
);

public sealed record RevokeRequest(
    string RefreshToken
);

public sealed record UserProfileResponse(
    Guid PlayerId,
    string Username,
    string Email,
    bool EmailConfirmed
);
