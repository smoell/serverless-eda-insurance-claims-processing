import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { EventBus } from "aws-cdk-lib/aws-events";
import { aws_ecs_patterns as ecs_patterns } from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';

import { EventbridgeToSqsProps, EventbridgeToSqs } from "@aws-solutions-constructs/aws-eventbridge-sqs";

export interface SettlementServiceProps {
    readonly bus: EventBus,
    readonly settlementImageName: string;
    readonly settlementTableName: string;
}
export class SettlementService extends Construct {
    constructor(scope: Construct, id: string, props?: SettlementServiceProps) {
        super(scope, id);

        const vpc = new ec2.Vpc(this, "settlement-vpc", {
            maxAzs: 3
        });

        const cluster = new ecs.Cluster(this, "settlement-cluster", {
            vpc: vpc
        });

        const table = new dynamodb.Table(this, props?.settlementTableName, {
            partitionKey: { name: "Id", type: dynamodb.AttributeType.STRING, },
            tableName: "Settlement",
            readCapacity: 5,
            writeCapacity: 5,
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });

        const constructProps: EventbridgeToSqsProps = {
            eventRuleProps: {
                schedule: events.Schedule.rate(Duration.minutes(1)),
                eventPattern: {
                    source: ["fraud.service"],
                    detail: {
                        documentType: ["CAR"],
                        fraudType: ["CLAIMS"]
                    },
                    detailType: ['Fraud.Not.Detected'],
                }
            }
        };

        const constructStack = new EventbridgeToSqs(this, 'sqs-construct', constructProps);
        const queue = constructStack.sqsQueue;

        const queueUrl = queue.queueUrl;

        const queueProcessingFargateService = new ecs_patterns.QueueProcessingFargateService(this, 'Service', {
            cluster,
            memoryLimitMiB: 1024,
            cpu: 512,
            queue: queue,
            image: ecs.ContainerImage.fromRegistry(props?.settlementImageName),
            minScalingCapacity: 1,
            maxScalingCapacity: 5,
            environment: {
                "SQS_ENDPOINT_URL":queueUrl,
                "EVENTBUS_NAME":props?.bus.eventBusName,
                "DYNAMODB_TABLE_NAME":props?.settlementTableName
            },
            capacityProviderStrategies: [
                {
                    capacityProvider: 'FARGATE_SPOT',
                    weight: 2,
                },
                {
                    capacityProvider: 'FARGATE',
                    weight: 1,
                },
            ],
        });

        const taskRole = queueProcessingFargateService.taskDefinition.taskRole;
        table.grantReadWriteData(taskRole);
    }
}
