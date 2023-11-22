import { Logger } from '@aws-lambda-powertools/logger';
import { send, SUCCESS, FAILED } from 'cfn-response-async';
import { SSMClient, DeleteParameterCommand, PutParameterCommand } from "@aws-sdk/client-ssm";
import { generateSchnorrKeyPair, createHashFromJson, sign } from '../lib/utils/crypto.js';
import TimelineInitialMessage from '../lib/timeline/TimelineInitialMessage.js';
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { InitialTimelineEntry } from '../lib/timeline';

const marshallOptions = {
    removeUndefinedValues: true
};
const dynamoDBClient = DynamoDBDocument.from(new DynamoDBClient(), { marshallOptions });

const logger = new Logger();
const ssmClient = new SSMClient();

const deleteTimeline = async (event, context) => {
    try {
        const command = new DeleteParameterCommand({
          Name: process.env.KEYS_SSM_PARAMETER,
        });
        await ssmClient.send(command);

        logger.info('Deleted keys');
        await send(event, context, SUCCESS);
    } catch (error) {
        logger.info({message: 'Error deleting keys', error});
        await send(event, context, FAILED);
    }
};

const createTimeline = async (event, context) => {
    logger.info(event);

    logger.debug({ message: 'createTimeline starts here' });

    const schnorrKeyPair = generateSchnorrKeyPair();
    const publicSKey = schnorrKeyPair.publicKey;
    const privateSKey = schnorrKeyPair.privateKey;

    const initialEntryMessage = new TimelineInitialMessage({
        name: process.env.TIMELINE_NAME,
        publicKey: publicSKey,
        sqs: process.env.SQS_ENTRIES_BRIDGE_ARN,
    });
    const timelineId = createHashFromJson(initialEntryMessage);
    const signature = sign(timelineId, privateSKey);

    const initialEntry: InitialTimelineEntry = {
        id: timelineId,
        timeline: timelineId,
        created: new Date(),
        signature,
        message: initialEntryMessage,
    };

    const responseData = {
        TimelineId: timelineId,
        InitialEntry: JSON.stringify(initialEntry),
    };

    logger.debug({
        message: 'initialEntry and responseData',
        initialEntry,
        responseData,
    })

    try {
        const command = new PutParameterCommand({
            Name: process.env.KEYS_SSM_PARAMETER,
            Description: "Timeline Provider Keys",
            Value: JSON.stringify({
                ...responseData,
                PrivateKey: privateSKey,
            }),
            Type: 'SecureString',
            KeyId: 'alias/aws/ssm',
        });
        await ssmClient.send(command);

        logger.debug({ message: 'Stored keys, and responseData is', responseData });

        await dynamoDBClient.put({
            TableName: process.env.TIMELINE_ENTRIES_TABLE,
            Item: {
                PK: initialEntry.timeline,
                SK: `Entry:${initialEntry.id}`,
                ID: initialEntry.id,
                Message: JSON.stringify(initialEntry.message),
                Created: initialEntry.created.getTime(),
                Signature: initialEntry.signature,
            },
            ConditionExpression: 'attribute_not_exists(SK)'
        });

        await send(event, context, SUCCESS, responseData);

      } catch (error) {
        logger.error({message: 'Error creating timeline', error});
        await send(event, context, FAILED);
      }
};

export const lambdaHandler = async (event, context) => {
    logger.info(event);
    logger.debug({ message: 'lambdaHandler starts here', event });

    switch(event.RequestType) {
        case 'Create':
            return await createTimeline(event, context);
        case 'Delete':
            return await deleteTimeline(event, context);
        case 'Update':
            return await send(event, context, SUCCESS);
        default:
            await send(event, context, FAILED, {
                ErrMsg: `Unknown RequestType ${event.RequestType}`
            });
    }
};
