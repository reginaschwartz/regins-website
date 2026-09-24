pipeline {
  agent any

  options {
    disableConcurrentBuilds()
  }

  environment {
    AWS_DEFAULT_REGION = 'eu-north-1'
    CERT_REGION = 'us-east-1'
    STACK_NAME = 'ec2test2'
    CERT_STACK_NAME = 'ec2test2-cert'
    DOMAIN_NAME = 'ec2test2.rinatschwartz770.xyz'
    ORIGIN_HOSTNAME = 'origin-ec2test2.rinatschwartz770.xyz'
    PARENT_ZONE = 'rinatschwartz770.xyz'
    KEY_NAME = 'test'
    INSTANCE_TYPE = 't3.micro'
  }

  stages {
    stage('Checkout') {
      steps {
        script {
          if (fileExists('/var/jenkins/repo/infra/deploy-ec2test2.sh')) {
            sh '''
              set -euo pipefail
              find . -mindepth 1 -maxdepth 1 -exec rm -rf {} +
              cp -a /var/jenkins/repo/. .
            '''
          } else {
            checkout scm
          }
        }
      }
    }

    stage('Create or update AWS env') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'aws-access-key',
            usernameVariable: 'AWS_ACCESS_KEY_ID',
            passwordVariable: 'AWS_SECRET_ACCESS_KEY'
          ),
          string(credentialsId: 'aws-session-token', variable: 'AWS_SESSION_TOKEN')
        ]) {
          sh '''
            set -euo pipefail
            command -v aws >/dev/null || {
              echo "Install the AWS CLI on this Jenkins agent (https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)"
              exit 1
            }
            chmod +x infra/deploy-ec2test2.sh
            infra/deploy-ec2test2.sh
          '''
        }
      }
    }

    stage('Archive outputs') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'aws-access-key',
            usernameVariable: 'AWS_ACCESS_KEY_ID',
            passwordVariable: 'AWS_SECRET_ACCESS_KEY'
          ),
          string(credentialsId: 'aws-session-token', variable: 'AWS_SESSION_TOKEN')
        ]) {
          sh '''
            set -euo pipefail
            aws cloudformation describe-stacks \
              --region "$AWS_DEFAULT_REGION" \
              --stack-name "$STACK_NAME" \
              --query 'Stacks[0].Outputs' \
              --output json > ec2test2-outputs.json
          '''
          archiveArtifacts artifacts: 'ec2test2-outputs.json', fingerprint: true
        }
      }
    }
  }
}
