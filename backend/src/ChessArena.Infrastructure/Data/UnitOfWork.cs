// DEPRECATED: EF/PostgreSQL — replaced by DynamoDb/ implementation. Remove after migration validation.
using ChessArena.Core.Interfaces;
using Microsoft.EntityFrameworkCore.Storage;

namespace ChessArena.Infrastructure.Data;

[Obsolete("EF/PostgreSQL — replaced by DynamoDB. Remove after migration validation.")]
public sealed class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    private IDbContextTransaction? _transaction;

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction != null)
            throw new InvalidOperationException("A transaction is already active.");

        _transaction = await db.Database.BeginTransactionAsync(ct);
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_transaction == null)
            throw new InvalidOperationException("No active transaction to commit.");

        await db.SaveChangesAsync(ct);
        await _transaction.CommitAsync(ct);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_transaction == null) return;

        await _transaction.RollbackAsync(ct);
        await _transaction.DisposeAsync();
        _transaction = null;
    }
}
