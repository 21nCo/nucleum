#!/bin/bash
set -e

echo "=========================================="
echo "SurrealDB Budget Deployment on AWS EKS"
echo "Estimated cost: ~$80-90/month"
echo "=========================================="

export CLUSTER_NAME=${CLUSTER_NAME:-surrealdb-cluster-budget}
export AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "Configuration:"
echo "  Cluster Name: $CLUSTER_NAME"
echo "  AWS Region: $AWS_REGION"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "Step 1: Creating EKS cluster..."
echo "This will take 15-20 minutes..."
envsubst < surrealdb-cluster-budget.yml | eksctl create cluster -f -

echo ""
echo "Step 2: Updating kubeconfig..."
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

echo ""
echo "Step 3: Installing TiDB operator..."
kubectl create namespace tidb-admin
helm repo add pingcap https://charts.pingcap.org/
helm repo update
helm install --namespace tidb-admin tidb-operator pingcap/tidb-operator --version v1.6.1 \
  --set operatorImage=pingcap/tidb-operator:v1.6.1 \
  --set tidbBackupManagerImage=pingcap/tidb-backup-manager:v1.6.1 \
  --set scheduler.create=true

echo ""
echo "Step 4: Waiting for TiDB operator to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=tidb-operator -n tidb-admin --timeout=300s

echo ""
echo "Step 5: Creating TiKV cluster..."
kubectl create namespace tidb-cluster
kubectl apply -f tidb-cluster-budget.yaml -n tidb-cluster

echo ""
echo "Step 6: Waiting for TiKV cluster to be ready..."
echo "This may take 10-15 minutes..."
kubectl wait --for=condition=ready tidbcluster/basic -n tidb-cluster --timeout=900s || true

echo ""
echo "Step 7: Creating IAM policy for ALB controller..."
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.11.0/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy-$CLUSTER_NAME \
    --policy-document file://iam_policy.json || echo "Policy may already exist, continuing..."

echo ""
echo "Step 8: Creating IAM service account for ALB controller..."
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole-$CLUSTER_NAME \
  --attach-policy-arn=arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AWSLoadBalancerControllerIAMPolicy-$CLUSTER_NAME \
  --approve \
  --region=$AWS_REGION

echo ""
echo "Step 9: Installing ALB controller..."
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=$AWS_REGION \
  --set vpcId=$(aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query "cluster.resourcesVpcConfig.vpcId" --output text)

echo ""
echo "Step 10: Waiting for ALB controller to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=aws-load-balancer-controller -n kube-system --timeout=300s

echo ""
echo "Step 11: Installing SurrealDB..."
helm repo add surrealdb https://helm.surrealdb.com
helm repo update

TIKV_URL="tikv://basic-pd.tidb-cluster:2379"

helm install surrealdb-tikv surrealdb/surrealdb \
  --set surrealdb.path=$TIKV_URL \
  --set surrealdb.auth=false \
  --set surrealdb.log=info \
  --set image.tag=v2.1.4 \
  --set service.type=NodePort \
  --set ingress.enabled=true \
  --set ingress.className=alb \
  --set-string ingress.annotations."alb\.ingress\.kubernetes\.io/healthcheck-path"="/health" \
  --set-string ingress.annotations."alb\.ingress\.kubernetes\.io/scheme"="internet-facing" \
  --set-string ingress.annotations."alb\.ingress\.kubernetes\.io/target-type"="ip" \
  --set replicaCount=1 \
  --set resources.requests.cpu=100m \
  --set resources.requests.memory=256Mi \
  --set resources.limits.cpu=500m \
  --set resources.limits.memory=512Mi

echo ""
echo "Step 12: Waiting for SurrealDB to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=surrealdb --timeout=300s

echo ""
echo "Step 13: Getting SurrealDB endpoint..."
sleep 30
export SURREALDB_ENDPOINT=$(kubectl get ingress surrealdb-tikv -o json | jq -r '.status.loadBalancer.ingress[0].hostname')

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "SurrealDB Endpoint: $SURREALDB_ENDPOINT"
echo ""
echo "Test your connection with:"
echo "  surreal sql -e http://$SURREALDB_ENDPOINT"
echo ""
echo "Cost Breakdown (Estimated):"
echo "  - EKS Control Plane: ~$73/month"
echo "  - EC2 Instances:"
echo "    * t3.micro (admin): ~$7.50/month"
echo "    * t3.small (pd): ~$15/month"
echo "    * t3.medium (tikv): ~$30/month"
echo "    * t3.small (default): ~$15/month"
echo "  - EBS Storage (30-40GB): ~$4/month"
echo "  - Data Transfer: ~$1-5/month"
echo "  TOTAL: ~$85-90/month"
echo ""
echo "⚠️  Note: This is a minimal setup for development/staging."
echo "    For production, consider:"
echo "    - Enabling multi-AZ deployment"
echo "    - Increasing replicas for high availability"
echo "    - Adding monitoring and backup solutions"
echo ""
