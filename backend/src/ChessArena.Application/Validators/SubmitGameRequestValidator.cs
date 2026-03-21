using ChessArena.Application.DTOs.Games;
using ChessArena.Core.Enums;
using FluentValidation;

namespace ChessArena.Application.Validators;

public sealed class SubmitGameRequestValidator : AbstractValidator<SubmitGameRequest>
{
    public SubmitGameRequestValidator()
    {
        RuleFor(x => x.AiLevel)
            .InclusiveBetween(1, 8);

        RuleFor(x => x.TimeControl)
            .NotEmpty()
            .Must(v => Enum.TryParse<TimeControl>(v, ignoreCase: true, out _))
            .WithMessage("TimeControl must be one of: bullet, blitz, rapid, custom.");

        RuleFor(x => x.Result)
            .NotEmpty()
            .Must(v => Enum.TryParse<GameResult>(v, ignoreCase: true, out _))
            .WithMessage("Result must be one of: win, loss, draw.");

        RuleFor(x => x.Termination)
            .NotEmpty()
            .Must(TerminationParser.IsValid)
            .WithMessage($"Termination must be one of: {string.Join(", ", TerminationParser.ValidWireValues)}.");

        RuleFor(x => x.PlayerColor)
            .NotEmpty()
            .Must(v => Enum.TryParse<PlayerColor>(v, ignoreCase: true, out _))
            .WithMessage("PlayerColor must be 'white' or 'black'.");

        RuleFor(x => x.Pgn)
            .NotEmpty()
            .MaximumLength(50_000);

        RuleFor(x => x.AccuracyPlayer)
            .InclusiveBetween(0f, 100f);

        RuleFor(x => x.DurationSeconds)
            .GreaterThan(0);
    }
}
