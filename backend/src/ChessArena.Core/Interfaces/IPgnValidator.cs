using ChessArena.Core.Enums;

namespace ChessArena.Core.Interfaces;

public interface IPgnValidator
{
    Task<bool> ValidateAsync(string pgn, GameResult declaredResult, PlayerColor playerColor, CancellationToken ct = default);
}
