import * as cdk from '@aws-cdk/core';
import * as StepFn from '@aws-cdk/aws-stepfunctions';
import * as StepFnTask from '@aws-cdk/aws-stepfunctions-tasks';
import * as Logs from '@aws-cdk/aws-logs';
import { LogLevel, StateMachineType } from '@aws-cdk/aws-stepfunctions';
import { CfnOutput, Duration } from '@aws-cdk/core';

export class StepfnCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const activity = new StepFn.Activity(this, "DemoActivityFromCDK", { activityName: "DemoActivityFromCDK" });
    
    const workflow = new StepFnTask.StepFunctionsInvokeActivity(this, "StepFnInvokeActivity", {
      activity: activity,
    });
    // ここにchain して workflowを構成していく 

    const logGroup = new Logs.LogGroup(this, 'MyLogGroup');

    const stateMachine = new StepFn.StateMachine(this, "DemoStateMachineFromCDK", {
      stateMachineName: "DemoStateMachineFromCDK",
      definition: workflow,
      stateMachineType: StateMachineType.STANDARD,
      timeout: Duration.seconds(60),
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
