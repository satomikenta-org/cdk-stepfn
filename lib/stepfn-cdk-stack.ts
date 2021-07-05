import * as cdk from '@aws-cdk/core';
import * as StepFn from '@aws-cdk/aws-stepfunctions';
import * as StepFnTask from '@aws-cdk/aws-stepfunctions-tasks';
import * as Logs from '@aws-cdk/aws-logs';
import * as Lambda from '@aws-cdk/aws-lambda';
import * as SNS from '@aws-cdk/aws-sns';
import * as Subscription from '@aws-cdk/aws-sns-subscriptions';
import { InputType, LogLevel, StateMachineType } from '@aws-cdk/aws-stepfunctions';
import { CfnOutput, Duration } from '@aws-cdk/core';

export class StepfnCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const activity = new StepFn.Activity(this, "DemoActivityFromCDK", { activityName: "DemoActivityFromCDK" });
    
    const task = new StepFnTask.StepFunctionsInvokeActivity(this, "StepFnInvokeActivity", {
      activity: activity,
      timeout: Duration.seconds(30),
    });
    const doubleTheNumber = new StepFnTask.EvaluateExpression(this, 'Double the number', {
      expression: '$.number * 2',
      resultPath: '$.number',
      runtime: Lambda.Runtime.NODEJS_14_X,
    });

    
    const myTopic = new SNS.Topic(this, 'MyTopic');
    myTopic.addSubscription(new Subscription.EmailSubscription('satomikennta1213@gmail.com'));
    
    // Callback Pattern
    const sendEmailTask = new StepFnTask.SnsPublish(this, 'SNSSendEmail', {
      topic: myTopic,
      message: {
        type: InputType.OBJECT,
        value: { literal: 'literal', token: StepFn.JsonPath.stringAt('$$.Task.Token') }
      },
      subject: "Confirmation Email",
      integrationPattern: StepFn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      timeout: Duration.minutes(30)
    });

    const jobFailed = new StepFn.Fail(this, 'Job Failed', {
      cause: 'Job Failed',
      error: 'Job returned FAILED',
    });
    const jobSucceeded = new StepFn.Succeed(this, 'Job Succeeded');

    const workflow = task
    .next(sendEmailTask)
    .next(doubleTheNumber)
    .next(new StepFn.Choice(this, 'even number ?')
      .when(StepFn.Condition.numberEquals('$.number', 4), jobSucceeded)
      .when(StepFn.Condition.numberEquals('$.number', 5), jobFailed)
    );

    const logGroup = new Logs.LogGroup(this, 'MyLogGroup');

    const stateMachine = new StepFn.StateMachine(this, "DemoStateMachineFromCDK", {
      stateMachineName: "DemoStateMachineFromCDK",
      definition: workflow,
      stateMachineType: StateMachineType.STANDARD,
      timeout: Duration.seconds(90),
      logs: {
        level: LogLevel.ALL,
        destination: logGroup
      }
    });

    new CfnOutput(this, "ActivityArnOutput", {
      exportName: "activityArn",
      value: activity.activityArn
    });

    new CfnOutput(this, "StateMachineArnOutput", {
      exportName: "stateMachineArn",
      value: stateMachine.stateMachineArn
    });
  }
}
