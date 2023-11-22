import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { createHashFromJson, sign } from '../lib/utils/crypto';
import { TimelineEntry } from 'lib/timeline';

const logger = new Logger();
const marshallOptions = {removeUndefinedValues: true};
const dynamoDBClient = DynamoDBDocument.from(new DynamoDBClient(), {marshallOptions});
const ssmClient = new SSMClient();

const addEntry = async (entryRequest) => {
    // 1. Combine data from APIGW and DDB
    const entryData = {
        timeline: process.env.TIMELINE_ID,
        created: new Date(),
        message: entryRequest.message,
        ...entryRequest.timelinePrev &&  {timelinePrev: entryRequest.timelinePrev},
        ...entryRequest.thread &&  {thread: entryRequest.thread},
        ...entryRequest.threadPrev && {threadPrev: entryRequest.threadPrev},
    };

    const ssmCommand = new GetParameterCommand({
      Name: process.env.KEYS_SSM_PARAMETER,
      WithDecryption: true,
    });

    const response = await ssmClient.send(ssmCommand);
    if (!response.Parameter?.Value) {
        throw new Error('Cannot retrieve SSM parameter')
    }
    const data = JSON.parse(response.Parameter.Value);

    // 2. Add signature
    const privateSKey = data.PrivateKey;
    const entryId = createHashFromJson(entryData);
    const entry: TimelineEntry = {
        ...entryData,
        id: entryId,
        signature: sign(entryId, privateSKey)
    };

    // 3. Save
    await dynamoDBClient.put({
        TableName: process.env.TIMELINE_ENTRIES_TABLE,
        Item: {
            PK: entry.timeline,
            SK: `Entry:${entry.id}`,
            ID: entry.id,
            ...entry.timelinePrev && { TimelinePrev: entry.timelinePrev },
            ...entry.thread && { Thread: entry.thread },
            ...entry.threadPrev && { ThreadPrev: entry.threadPrev },
            Message: typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message),
            Created: entry.created.getTime(),
            Signature: entry.signature,
        },
        ConditionExpression: 'attribute_not_exists(SK)'
    });

    return entry;
};

export const lambdaHandler = async (event) => {
    logger.debug(event);
    const entryRequest = JSON.parse(event.body);

    try {
        const entry = await addEntry(entryRequest);

        return {
            statusCode: 200,
            body: JSON.stringify(entry),
        };

    } catch(error) {
        logger.error({
            message: `Error processing record`,
            error
        });
    }
};
