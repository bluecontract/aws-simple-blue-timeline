import { Logger } from '@aws-lambda-powertools/logger';
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { createHashFromJson, sign } from '../lib/utils/crypto';
import { TimelineEntry } from 'lib/timeline';
import { TimelineRepository } from 'lib/timeline/TimelineRepository';
import { TimelineEntryError } from 'lib/timeline/errors';

const logger = new Logger();
const ssmClient = new SSMClient();

const repository = new TimelineRepository(process.env.TIMELINE_ENTRIES_TABLE);

interface EntryData {
    timeline: string
    created: Date
    message: object
    timelinePrev?: string
    thread?: string
    threadPrev?: string
}

const addEntry = async (entryRequest) => {
    // 1. Prepare record
    const entryData: EntryData = {
        timeline: process.env.TIMELINE_ID!,
        created: new Date(),
        message: entryRequest.message,
    };

    // 2. Assign timelinePrev
    const timelinePrev = await repository.getLastEntryId(entryData.timeline);
    if (entryRequest.timelinePrev && entryRequest.timelinePrev !== timelinePrev) {
        throw new TimelineEntryError('Illegal timelinePrev value');
    }
    entryData.timelinePrev = timelinePrev;

    // 3. Assign threadPrev
    if (entryRequest.thread) {
        const threadPrev = await repository.getLastEntryId(entryData.timeline, entryRequest.thread);
        if (entryRequest.threadPrev && entryRequest.threadPrev !== threadPrev) {
            throw new TimelineEntryError('Illegal threadPrev value');
        }
        entryData.thread = entryRequest.thread;
        entryData.threadPrev = threadPrev;
    }


    const ssmCommand = new GetParameterCommand({
      Name: process.env.KEYS_SSM_PARAMETER,
      WithDecryption: true,
    });

    const response = await ssmClient.send(ssmCommand);
    if (!response.Parameter?.Value) {
        throw new TimelineEntryError('Cannot retrieve SSM parameter')
    }
    const data = JSON.parse(response.Parameter.Value);

    // 4. Add signature
    const privateSKey = data.PrivateKey;
    const entryId = createHashFromJson(entryData);
    const entry: TimelineEntry = {
        ...entryData,
        id: entryId,
        signature: sign(entryId, privateSKey)
    };

    // 3. Save
    await repository.putEntry(entry);

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

    } catch (error) {
        logger.error({
            message: `Error processing record`,
            error
        });
        if (error instanceof TimelineEntryError) {
            return {
                statusCode: 400,
                body: JSON.stringify({error: error.message}),
            };
        }
        throw error;
    }
};
