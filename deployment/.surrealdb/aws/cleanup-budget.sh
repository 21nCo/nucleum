#!/bin/bash
set -e

export CLUSTER_NAME=${CLUSTER_NAME:-surrealdb-cluster-budget}
export AWS_REGION=${AWS_REGION:-us-east-1}

echo "=========================================="
echo "SurrealDB Cluster Cleanup"
echo "=========================================="
echo ""
echo "This will delete:"
echo "  - SurrealDB installation"
echo "  - TiKV cluster"
echo "  - ALB controller"
echo "  - TiDB operator"
echo "  - EKS cluster: $CLUSTER_NAME"
echo "  - All associated resources"
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 1
fi

echo ""
echo "Step 1: Uninstalling SurrealDB..."
helm uninstall surrealdb-tikv || echo "SurrealDB not found, skipping..."

echo ""
echo "Step 2: Deleting TiKV cluster..."
kubectl delete -f tidb-cluster-budget.yaml -n tidb-cluster || echo "TiKV cluster not found, skipping..."
kubectl delete namespace tidb-cluster || echo "Namespace not found, skipping..."

echo ""
echo "Step 3: Uninstalling ALB controller..."
helm -n kube-system uninstall aws-load-balancer-controller || echo "ALB controller not found, skipping..."

echo ""
echo "Step 4: Uninstalling TiDB operator..."
helm -n tidb-admin uninstall tidb-operator || echo "TiDB operator not found, skipping..."
kubectl delete namespace tidb-admin || echo "Namespace not found, skipping..."

echo ""
echo "Step 5: Deleting EKS cluster..."
echo "This will take 10-15 minutes..."
eksctl delete cluster --force --disable-nodegroup-eviction --parallel 10 --name $CLUSTER_NAME --region $AWS_REGION

echo ""
echo "Step 6: Deleting IAM policy..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam delete-policy --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy-$CLUSTER_NAME || echo "Policy not found or already deleted"

echo ""
echo "=========================================="
echo "✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "⚠️  Note: EBS volumes may have been preserved."
echo "    Check AWS Console and delete manually if needed:"
echo "    https://console.aws.amazon.com/ec2/v2/home?region=$AWS_REGION#Volumes"
echo ""
