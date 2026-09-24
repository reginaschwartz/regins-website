#!/usr/bin/env bash
# Create or update the persistent ec2test2 CloudFormation stacks.
# Does not build the site or SSH to the instance.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_TEMPLATE="$ROOT/infra/ec2test2-cert.yaml"
APP_TEMPLATE="$ROOT/infra/ec2test2.yaml"

STACK_NAME="${STACK_NAME:-ec2test2}"
CERT_STACK_NAME="${CERT_STACK_NAME:-ec2test2-cert}"
APP_REGION="${AWS_DEFAULT_REGION:-eu-north-1}"
CERT_REGION="${CERT_REGION:-us-east-1}"
DOMAIN_NAME="${DOMAIN_NAME:-ec2test2.rinatschwartz770.xyz}"
ORIGIN_HOSTNAME="${ORIGIN_HOSTNAME:-origin-ec2test2.rinatschwartz770.xyz}"
PARENT_ZONE="${PARENT_ZONE:-rinatschwartz770.xyz}"
KEY_NAME="${KEY_NAME:-test}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.micro}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

need aws

echo "Using AWS identity:"
aws sts get-caller-identity

HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
if [[ -z "$HOSTED_ZONE_ID" ]]; then
  HOSTED_ZONE_ID="$(
    aws route53 list-hosted-zones-by-name \
      --dns-name "$PARENT_ZONE" \
      --query 'HostedZones[0].Id' \
      --output text
  )"
  HOSTED_ZONE_ID="${HOSTED_ZONE_ID##*/}"
fi
if [[ -z "$HOSTED_ZONE_ID" || "$HOSTED_ZONE_ID" == "None" ]]; then
  echo "could not resolve Route 53 hosted zone for $PARENT_ZONE" >&2
  exit 1
fi
echo "Hosted zone $HOSTED_ZONE_ID ($PARENT_ZONE)"

CERTIFICATE_ARN="${CERTIFICATE_ARN:-}"
if [[ -z "$CERTIFICATE_ARN" ]]; then
  CERTIFICATE_ARN="$(
    aws acm list-certificates --region "$CERT_REGION" --certificate-statuses ISSUED \
      --query 'CertificateSummaryList[].CertificateArn' --output text
  )"
  MATCHED=""
  for arn in $CERTIFICATE_ARN; do
    sans="$(
      aws acm describe-certificate --region "$CERT_REGION" --certificate-arn "$arn" \
        --query 'Certificate.SubjectAlternativeNames' --output text
    )"
    if [[ " $sans " == *" ${DOMAIN_NAME} "* || " $sans " == *" *.${PARENT_ZONE} "* ]]; then
      MATCHED="$arn"
      break
    fi
  done
  CERTIFICATE_ARN="$MATCHED"
fi

if [[ -z "$CERTIFICATE_ARN" ]]; then
  echo "Deploying ACM certificate stack $CERT_STACK_NAME in $CERT_REGION"
  aws cloudformation deploy \
    --region "$CERT_REGION" \
    --stack-name "$CERT_STACK_NAME" \
    --template-file "$CERT_TEMPLATE" \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
      "DomainName=${DOMAIN_NAME}" \
      "HostedZoneId=${HOSTED_ZONE_ID}"
  CERTIFICATE_ARN="$(
    aws cloudformation describe-stacks \
      --region "$CERT_REGION" \
      --stack-name "$CERT_STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='CertificateArn'].OutputValue" \
      --output text
  )"
else
  echo "Reusing ACM certificate $CERTIFICATE_ARN"
fi

if [[ -z "$CERTIFICATE_ARN" || "$CERTIFICATE_ARN" == "None" ]]; then
  echo "no CertificateArn available" >&2
  exit 1
fi

echo "Deploying application stack $STACK_NAME in $APP_REGION"
aws cloudformation deploy \
  --region "$APP_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$APP_TEMPLATE" \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "DomainName=${DOMAIN_NAME}" \
    "OriginHostname=${ORIGIN_HOSTNAME}" \
    "HostedZoneId=${HOSTED_ZONE_ID}" \
    "CertificateArn=${CERTIFICATE_ARN}" \
    "KeyName=${KEY_NAME}" \
    "InstanceType=${INSTANCE_TYPE}"

echo
echo "Stack outputs:"
aws cloudformation describe-stacks \
  --region "$APP_REGION" \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs' \
  --output table
