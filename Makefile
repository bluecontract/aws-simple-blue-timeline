# Variables
SAM_ENV?=dev

# Commands
.PHONY: all build test deploy remove quick-create

all: build test deploy

build:
	cd layer_nodejs_base/nodejs && npm ci && cd ../..
	node esbuild.js
	sam build --config-file samconfig.toml --config-env $(SAM_ENV)
	cfn-lint .aws-sam/build/template.yaml -i W3002

build_sam:
	node esbuild.js
	sam build --config-file samconfig.toml --config-env $(SAM_ENV)

test:
	$(info Running tests - TODO)

deploy:
	$(info Deploying SAM application)
	sam deploy --config-file samconfig.toml --config-env $(SAM_ENV)

remove:
	$(warning Removing SAM application)
	sam delete --config-file samconfig.toml --config-env $(SAM_ENV)

quick-create:
	cd layer_nodejs_base/nodejs && npm ci && cd ../..
	node esbuild.js
	sam build
	sam package --s3-bucket bc-production-timeline-provider-cfn > aws-simple-blue-timeline.yaml
	aws s3 cp aws-simple-blue-timeline.yaml s3://bc-production-timeline-provider-cfn
