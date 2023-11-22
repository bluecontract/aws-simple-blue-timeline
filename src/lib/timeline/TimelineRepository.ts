import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { TimelineEntry } from '.';
import { TimelineEntryError } from './errors';

export class TimelineRepository {
    tableName: string;
    dynamoDBClient: DynamoDBDocument;

    constructor(tableName) {
        this.tableName = tableName;
        const marshallOptions = {
            removeUndefinedValues: true
        };
        this.dynamoDBClient =DynamoDBDocument.from(
            new DynamoDBClient(),
            {marshallOptions}
        );
    }

    async putEntry(entry: TimelineEntry) {
        const transactTransitionItems: object[] = [
            {
                Put: {
                    TableName: this.tableName,
                    Item: {
                        PK: entry.timeline,
                        SK: `Entry:${entry.id}`,
                        ID: entry.id,
                        ...entry.timelinePrev && { TimelinePrev: entry.timelinePrev },
                        ...entry.thread && { Thread: entry.thread },
                        ...entry.threadPrev && { ThreadPrev: entry.threadPrev },
                        Message: JSON.stringify(entry.message),
                        Created: entry.created.getTime(),
                        Signature: entry.signature,
                    },
                    ConditionExpression: 'attribute_not_exists(SK)'
                }
            }
        ]
        if (entry.timelinePrev) {
            transactTransitionItems.push({
                Update: {
                    TableName: this.tableName,
                    Key: {
                        PK: entry.timeline,
                        SK: `Entry:${entry.timeline}`,
                    },
                    UpdateExpression: 'SET LastEntryId = :id',
                    ConditionExpression: 'LastEntryId = :timelinePrev OR attribute_not_exists(LastEntryId)',
                    ExpressionAttributeValues: { ':id': entry.id, ':timelinePrev': entry.timelinePrev },
                }
            });
        }
        if (entry.thread && entry.threadPrev) {
            transactTransitionItems.push({
                Update: {
                    TableName: this.tableName,
                    Key: {
                        PK: entry.timeline,
                        SK: `Entry:${entry.thread}`,
                    },
                    UpdateExpression: 'SET LastEntryId = :id',
                    ConditionExpression: 'LastEntryId = :threadPrev OR attribute_not_exists(LastEntryId)',
                    ExpressionAttributeValues: { ':id': entry.id, ':threadPrev': entry.threadPrev },
                }
            });
        }
        await this.dynamoDBClient.transactWrite({TransactItems: transactTransitionItems});
    }

    async getEntry(timeline: string, id: string): Promise<TimelineEntry|null> {
        const { Item } = await this.dynamoDBClient.get({
            TableName: this.tableName,
            Key: {
                PK: timeline,
                SK: `Entry:${id}`,
            }
        });
        if (!Item) {
            return null;
        }
        return {
            id: Item.ID,
            timeline: Item.PK,
            created: new Date(Item.Created),
            signature: Item.Signature,
            message: JSON.parse(Item.Message),
            ...Item.TimelinePrev && { timelinePrev: Item.TimelinePrev },
            ...Item.Thread && { thread: Item.Thread },
            ...Item.ThreadPrev && { threadPrev: Item.ThreadPrev },
            ...Item.LastEntryId && { lastEntryId: Item.LastEntryId },
        }
    }

    async getLastEntryId(timeline: string, thread?: string): Promise<string> {
        const entry = await this.getEntry(timeline, thread || timeline);
        if (!entry) {
            throw new TimelineEntryError('Timeline or thread ${thread || timeline} cannot be found');
        }
        return entry.lastEntryId || entry.id;
    }
}