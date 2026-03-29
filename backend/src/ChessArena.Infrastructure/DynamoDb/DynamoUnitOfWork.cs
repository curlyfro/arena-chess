using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.DynamoDb;

/// <summary>
/// DynamoDB UnitOfWork that buffers TransactWriteItems.
/// Repositories enlist via <see cref="Enlist"/> and contribute items on commit.
/// CommitAsync flushes all enlisted participants, then sends atomically.
/// </summary>
public sealed class DynamoUnitOfWork(IAmazonDynamoDB dynamoDb) : IUnitOfWork
{
    private List<TransactWriteItem>? _buffer;
    private readonly List<Func<List<TransactWriteItem>, CancellationToken, Task>> _participants = [];

    public bool IsActive => _buffer is not null;

    public Task BeginTransactionAsync(CancellationToken ct = default)
    {
        if (_buffer is not null)
            throw new InvalidOperationException("A transaction is already active.");

        _buffer = [];
        return Task.CompletedTask;
    }

    /// <summary>
    /// Register a participant that will contribute TransactWriteItems on commit.
    /// Called once by each repository during DI construction.
    /// </summary>
    public void Enlist(Func<List<TransactWriteItem>, CancellationToken, Task> flushCallback)
    {
        _participants.Add(flushCallback);
    }

    /// <summary>
    /// Add a write item to the transaction buffer directly.
    /// </summary>
    public void AddWriteItem(TransactWriteItem item)
    {
        if (_buffer is null)
            throw new InvalidOperationException("No active transaction. Call BeginTransactionAsync first.");

        _buffer.Add(item);
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_buffer is null)
            throw new InvalidOperationException("No active transaction to commit.");

        // Let all enlisted participants contribute their pending items
        foreach (var flush in _participants)
            await flush(_buffer, ct);

        if (_buffer.Count > 0)
        {
            await dynamoDb.TransactWriteItemsAsync(new TransactWriteItemsRequest
            {
                TransactItems = _buffer,
            }, ct);
        }

        _buffer = null;
    }

    public Task RollbackAsync(CancellationToken ct = default)
    {
        _buffer = null;
        return Task.CompletedTask;
    }
}
