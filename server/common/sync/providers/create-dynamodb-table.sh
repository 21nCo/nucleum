#!/bin/bash

echo "Creating DynamoDB table for integration tests..."

aws dynamodb create-table \
  --table-name test-dynamodb-sync-table \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "Table creation initiated successfully!"
  echo "Waiting for table to become active..."
  
  aws dynamodb wait table-exists \
    --table-name test-dynamodb-sync-table \
    --region us-east-1
    
  echo "Table is now active and ready for testing!"
else
  echo "Failed to create table. Please check your AWS credentials and permissions."
fi 