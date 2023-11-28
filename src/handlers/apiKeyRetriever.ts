import { Logger } from '@aws-lambda-powertools/logger';
import { send, SUCCESS, FAILED } from 'cfn-response-async';
import { APIGatewayClient, GetApiKeyCommand } from "@aws-sdk/client-api-gateway";

const logger = new Logger();
const client = new APIGatewayClient();

const retrieveKey = async (event, context) => {
    const command = new GetApiKeyCommand({
      apiKey: event.ResourceProperties.ApiKeyId,
      includeValue: true,
    });
    try {
        const response = await client.send(command);
        const responseData = {
            ApiKey: response.value,
        };

        await send(event, context, SUCCESS, responseData);

      } catch (error) {
        logger.error({message: 'Error getting Api Key', error});
        await send(event, context, FAILED);
      }
};

export const lambdaHandler = async (event, context) => {
    switch(event.RequestType) {
        case 'Create':
            return await retrieveKey(event, context);
        case 'Delete':
            return await send(event, context, SUCCESS);
        case 'Update':
            return await send(event, context, SUCCESS);
        default:
            await send(event, context, FAILED, {
                ErrMsg: `Unknown RequestType ${event.RequestType}`
            });
    }
};
