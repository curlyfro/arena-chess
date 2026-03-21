using ChessArena.Core.Entities;
using Microsoft.AspNetCore.Identity;

namespace ChessArena.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public Guid? PlayerId { get; set; }
    public Player? Player { get; set; }
}
