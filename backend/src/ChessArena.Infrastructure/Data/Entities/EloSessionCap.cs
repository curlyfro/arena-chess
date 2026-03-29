// DEPRECATED: EF/PostgreSQL — replaced by DynamoDb/ implementation. Remove after migration validation.
namespace ChessArena.Infrastructure.Data.Entities;

[Obsolete("EF/PostgreSQL — entity eliminated. Session cap derived from game queries in DynamoDB. Remove after migration validation.")]
public class EloSessionCap
{
    public Guid Id { get; set; }
    public Guid PlayerId { get; set; }
    public DateOnly Date { get; set; }
    public int TotalDelta { get; set; }
}
