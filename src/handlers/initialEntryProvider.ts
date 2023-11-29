import { Logger } from '@aws-lambda-powertools/logger';
import YAML from 'yaml';

const logger = new Logger();

export const lambdaHandler = async (event) => {
    logger.debug({
        message: 'Received event',
        event,
    });

    const acceptHeader = event.headers['Accept'] || event.headers['accept'];

    if (acceptHeader === 'application/yaml') {
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/yaml'},
            body: YAML.stringify(JSON.parse(process.env.InitialEntry!))
        };
    } else {
        // Default to JSON if the header is not set to YAML
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/json'},
            body: process.env.InitialEntry,
        };
    }
}
