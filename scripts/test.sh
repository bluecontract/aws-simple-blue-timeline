set -e
set -x

# This will eventually come from CICD configuration
REGION="eu-west-1"
SAM_DEPLOYMENT_BUCKET="bluecontract-provider-deployment-dev-${REGION}"

if [ -z $COMMIT_ID ]; then
    COMMIT_ID=`git rev-parse --verify HEAD`
fi

if [ -z $COMMIT_ID ]; then
    CODE=$(date +"%Y-%m-%d-%T" )
else
    CODE=$(echo $COMMIT_ID | cut -c -6)
fi

############################################

ENVIRONMENT="int-test-${CODE}"
CONFIG_FILE="samconfig-${ENVIRONMENT}.toml"
STACK_NAME="bluecontract-${ENVIRONMENT}"

cp samconfig.toml ${CONFIG_FILE}

sed -i "s/{{TESTING_ENV_NAME}}/$ENVIRONMENT/g" ${CONFIG_FILE}

############################################

sam deploy \
    --region "${REGION}" \
    --config-file ${CONFIG_FILE} \
    --stack-name ${STACK_NAME} \
    --config-env "integration-testing" \
    --s3-bucket "${SAM_DEPLOYMENT_BUCKET}" \
    --s3-prefix ${STACK_NAME}

############################################

sam list stack-outputs --stack-name ${STACK_NAME} --output json > /tmp/${STACK_NAME}

API_ENDPOINT_URL=`jq 'map(select(.OutputKey=="ApiEndpoint"))[0].OutputValue' /tmp/${STACK_NAME}`
API_KEY=`jq 'map(select(.OutputKey=="ApiKey"))[0].OutputValue' /tmp/${STACK_NAME}`
cp .env-template .env
sed -i~ "/^export API_ENDPOINT_URL=/s|=.*|=$API_ENDPOINT_URL|" .env
sed -i~ "/^export API_KEY=/s|=.*|=$API_KEY|" .env

npm install
npm run test:integration

############################################

sam delete \
    --region "${REGION}" \
    --config-file ${CONFIG_FILE} \
    --config-env ${ENVIRONMENT} \
    --stack-name ${STACK_NAME} \
    --config-env "integration-testing" \
    --s3-bucket "${SAM_DEPLOYMENT_BUCKET}" \
    --s3-prefix ${STACK_NAME} \
    --no-prompts

rm $CONFIG_FILE
