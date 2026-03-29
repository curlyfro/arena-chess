using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ChessArena.Infrastructure.DynamoDb;

/// <summary>
/// Creates the chess-arena table on startup if it doesn't exist.
/// Intended for DynamoDB Local development — production tables are managed via IaC.
/// </summary>
public sealed class DynamoDbTableInitializer(
    IAmazonDynamoDB dynamoDb,
    ILogger<DynamoDbTableInitializer> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        try
        {
            await dynamoDb.DescribeTableAsync(DynamoConstants.TableName, ct);
            logger.LogInformation("DynamoDB table '{Table}' already exists", DynamoConstants.TableName);
            return;
        }
        catch (ResourceNotFoundException)
        {
            // Table doesn't exist — create it
        }

        logger.LogInformation("Creating DynamoDB table '{Table}'...", DynamoConstants.TableName);

        var request = new CreateTableRequest
        {
            TableName = DynamoConstants.TableName,
            AttributeDefinitions =
            [
                new(DynamoConstants.Pk, ScalarAttributeType.S),
                new(DynamoConstants.Sk, ScalarAttributeType.S),
                new(DynamoConstants.Gsi1Pk, ScalarAttributeType.S),
                new(DynamoConstants.Gsi1Sk, ScalarAttributeType.S),
            ],
            KeySchema =
            [
                new(DynamoConstants.Pk, KeyType.HASH),
                new(DynamoConstants.Sk, KeyType.RANGE),
            ],
            GlobalSecondaryIndexes =
            [
                new()
                {
                    IndexName = DynamoConstants.Gsi1Name,
                    KeySchema =
                    [
                        new(DynamoConstants.Gsi1Pk, KeyType.HASH),
                        new(DynamoConstants.Gsi1Sk, KeyType.RANGE),
                    ],
                    Projection = new Projection { ProjectionType = ProjectionType.ALL },
                    ProvisionedThroughput = new ProvisionedThroughput(5, 5),
                },
            ],
            ProvisionedThroughput = new ProvisionedThroughput(5, 5),
        };

        await dynamoDb.CreateTableAsync(request, ct);

        await dynamoDb.UpdateTimeToLiveAsync(new UpdateTimeToLiveRequest
        {
            TableName = DynamoConstants.TableName,
            TimeToLiveSpecification = new TimeToLiveSpecification
            {
                Enabled = true,
                AttributeName = DynamoConstants.Ttl,
            },
        }, ct);

        logger.LogInformation("DynamoDB table '{Table}' created with GSI1 and TTL", DynamoConstants.TableName);
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
