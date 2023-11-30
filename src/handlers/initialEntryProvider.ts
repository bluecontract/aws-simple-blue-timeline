import { Logger } from '@aws-lambda-powertools/logger';
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import YAML from 'yaml';

const logger = new Logger();
const ssmClient = new SSMClient();

export const lambdaHandler = async (event) => {
    logger.debug({
        message: 'Received event',
        event,
    });
    const response = await ssmClient.send(new GetParameterCommand({
        Name: process.env.KEYS_SSM_PARAMETER,
        WithDecryption: true,
    }));
    if (!response.Parameter?.Value) {
        throw new Error('Cannot retrieve SSM parameter')
    }
    const {InitialEntry} = JSON.parse(response.Parameter.Value);

    const acceptHeader = event.headers['Accept'] || event.headers['accept'];

    if (acceptHeader === 'application/json') {
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/json'},
            body: InitialEntry,
        };
    } else {
        // Default to YAML if the header is not set to JSON
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/yaml'},
            body: YAML.stringify(JSON.parse(InitialEntry))
        };
    }
}
