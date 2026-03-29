using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Core.Constants;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.DynamoDb;

public sealed class DynamoSessionCapService(IAmazonDynamoDB dynamoDb) : ISessionCapService
{
    public async Task<bool> CheckAndIncrementAsync(
        Guid playerId, int delta, CancellationToken ct = default)
    {
        var currentTotal = await GetCurrentTotalAsync(playerId, ct);
        return currentTotal + delta <= RatingConstants.SessionCapMax;
    }

    public async Task<int> GetCurrentTotalAsync(Guid playerId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddHours(-24);

        int total = 0;
        Dictionary<string, AttributeValue>? startKey = null;

        do
        {
            var response = await dynamoDb.QueryAsync(new QueryRequest
            {
                TableName = DynamoConstants.TableName,
                KeyConditionExpression = $"{DynamoConstants.Pk} = :pk AND {DynamoConstants.Sk} BETWEEN :lo AND :hi",
                FilterExpression = "EloChange > :zero",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":pk"] = new(KeyHelpers.PlayerPk(playerId)),
                    [":lo"] = new(KeyHelpers.GameSkLowerBound(cutoff)),
                    [":hi"] = new(KeyHelpers.GameSkUpperBound(now)),
                    [":zero"] = new() { N = "0" },
                },
                ProjectionExpression = "EloChange",
                ExclusiveStartKey = startKey,
            }, ct);

            foreach (var item in response.Items)
                total += int.Parse(item["EloChange"].N);

            startKey = response.LastEvaluatedKey;
        } while (startKey is { Count: > 0 });

        return total;
    }
}
