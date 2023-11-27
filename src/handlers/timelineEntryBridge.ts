import { Logger } from '@aws-lambda-powertools/logger';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import sizeof from 'object-sizeof'

const logger = new Logger();
const sqsClient = new SQSClient();

const sendToSQS = async (data) => {
    logger.debug('Sending data to SQS', {data, queue: process.env.SQS_ENTRIES_BRIDGE});
    try {
        const command = new SendMessageCommand({
            MessageBody: JSON.stringify(data),
            QueueUrl: process.env.SQS_ENTRIES_BRIDGE,
        });

        const result = await sqsClient.send(command);
        logger.debug({
            message: `sendToSQS: request sent successfully, message ID: ${result.MessageId}`,
            data,
        });
    } catch(error) {
        logger.error({message: '--exception--', error})
    }

};

const processRecords = async (records) => {
    let recordsList:unknown[] = []

    for (const record of records) {
        if (record.eventName !== 'INSERT') continue;

        logger.debug({message: '--record--', record})

        const ddbItem = unmarshall(record.dynamodb.NewImage);

        let message;
        try {
            message = JSON.parse(ddbItem.Message);
        } catch (eJson) {
            message = ddbItem.Message;
        }

        const item = {
            eventID: record.eventID,
            timeline: process.env.TIMELINE_ID,
            id: ddbItem.ID,
            message,
            signature: ddbItem.Signature,
            created: ddbItem.Created,
            ...ddbItem.TimelinePrev && { timelinePrev: ddbItem.TimelinePrev },
            ...ddbItem.Thread && { thread: ddbItem.Thread },
            ...ddbItem.ThreadPrev && { threadPrev: ddbItem.ThreadPrev },
            ...ddbItem.TrackingId && { trackingId: ddbItem.TrackingId },
        };

        logger.debug({message: '--item--', item})

        if (sizeof(item) + sizeof(recordsList) > 262000) {
            if (!recordsList.length) {
                logger.error({message: 'Size of record exceeds SQS limit', size: sizeof(item)})

                throw new Error('Size of record exceeds SQS limit');
            }

            await sendToSQS(recordsList);
            recordsList = [];
        }

        recordsList.push(item);
    }

    await sendToSQS(recordsList);
}

export const lambdaHandler = async (event) => {
    logger.debug({
        message: 'Received event',
        event,
    });

    try {
        await processRecords(event.Records)
    } catch (error) {
        logger.error({
            message: `Error processing records`,
            event,
            error,
        });
        throw error;
    }
};
