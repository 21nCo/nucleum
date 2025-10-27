# SurrealDB on AWS EKS - Budget Deployment

Cost-optimized deployment of SurrealDB cluster on AWS EKS, designed for early-stage projects with a target budget of ~$85-90/month.

## Cost Breakdown

**Monthly Estimate: ~$85-90**

- **EKS Control Plane**: $73/month (fixed cost)
- **EC2 Instances**:
  - 1x t3.micro (admin node): ~$7.50/month
  - 1x t3.small (PD node): ~$15/month
  - 1x t3.medium (TiKV storage): ~$30/month
  - 1x t3.small (default workload): ~$15/month
- **EBS Storage**: ~$4/month (30-40GB gp3 volumes)
- **Data Transfer**: ~$1-5/month (depends on usage)

## Cost Optimizations Applied

Compared to the original guide ($3,600/month), this setup reduces costs by:

1. **Single AZ deployment** - Eliminates cross-AZ data transfer costs
2. **T3 burstable instances** - Instead of c5.xlarge and r5b.2xlarge
3. **Minimal replicas** - 1 replica each for PD and TiKV (vs 3 in production)
4. **Reduced resource requests** - Tuned for development/staging workloads
5. **gp3 storage** - Cost-effective block storage
6. **Smaller storage volumes** - 10GB for PD, 20GB for TiKV

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **eksctl** - EKS cluster management tool
3. **kubectl** - Kubernetes CLI
4. **helm** - Kubernetes package manager
5. **jq** - JSON processor

### Installation

```bash
# macOS
brew install awscli eksctl kubectl helm jq

# Verify installations
aws --version
eksctl version
kubectl version --client
helm version
```

## Deployment

### 1. Configure AWS credentials

```bash
aws configure
```

### 2. Set environment variables (optional)

```bash
export CLUSTER_NAME=surrealdb-cluster-budget
export AWS_REGION=us-east-1  # Choose your preferred region
```

### 3. Run deployment script

```bash
cd deployment/surrealdb-aws
chmod +x deploy-budget.sh
./deploy-budget.sh
```

The script will:
- Create an EKS cluster (~15-20 min)
- Install TiDB operator
- Deploy TiKV cluster
- Install AWS Load Balancer Controller
- Deploy SurrealDB
- Provide connection endpoint

### 4. Test connection

```bash
# Get the endpoint
export SURREALDB_ENDPOINT=$(kubectl get ingress surrealdb-tikv -o json | jq -r '.status.loadBalancer.ingress[0].hostname')

# Test with SurrealDB CLI
surreal sql -e http://$SURREALDB_ENDPOINT

# Or use curl
curl http://$SURREALDB_ENDPOINT/health
```

## Cleanup

To delete all resources:

```bash
chmod +x cleanup-budget.sh
./cleanup-budget.sh
```

**Note**: Check AWS Console for any remaining EBS volumes and delete manually if needed.

## Important Warnings

⚠️ **This is a development/staging setup**, not recommended for production use:

- **No High Availability**: Single AZ deployment means downtime if AZ fails
- **Limited Performance**: T3 instances use burst credits; sustained load may throttle
- **Data Loss Risk**: Single replica means no redundancy
- **No Authentication**: SurrealDB auth is disabled (add it in production!)

## Production Upgrade Path

When ready to scale, consider:

1. **Multi-AZ deployment**:
   ```yaml
   availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"]
   ```

2. **Increase replicas**:
   ```yaml
   pd:
     replicas: 3
   tikv:
     replicas: 3
   ```

3. **Larger instances**:
   - TiKV: Switch to c5.large or c5.xlarge
   - PD: Switch to t3.medium or c5.large

4. **Enable authentication**:
   ```bash
   --set surrealdb.auth=true \
   --set surrealdb.user=admin \
   --set surrealdb.pass=strongpassword
   ```

5. **Add monitoring**: Prometheus, Grafana, CloudWatch
6. **Setup backups**: Use TiDB BR or custom backup solutions
7. **Enable SSL/TLS**: Use cert-manager for HTTPS

## Monitoring Costs

Monitor your AWS costs:

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

Set up AWS Budgets alert when costs exceed $100/month:

```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

## Troubleshooting

### Cluster creation fails
```bash
# Check eksctl logs
eksctl get cluster --name $CLUSTER_NAME --region $AWS_REGION

# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name eksctl-$CLUSTER_NAME-cluster \
  --region $AWS_REGION
```

### TiKV not starting
```bash
# Check TiKV pods
kubectl get pods -n tidb-cluster
kubectl describe pod <tikv-pod-name> -n tidb-cluster
kubectl logs <tikv-pod-name> -n tidb-cluster
```

### SurrealDB connection issues
```bash
# Check SurrealDB pods
kubectl get pods -l app.kubernetes.io/name=surrealdb
kubectl logs <surrealdb-pod-name>

# Check ingress
kubectl describe ingress surrealdb-tikv
```

## Support

- [SurrealDB Documentation](https://surrealdb.com/docs)
- [TiKV Documentation](https://tikv.org/docs/)
- [EKS Documentation](https://docs.aws.amazon.com/eks/)

## License

This deployment configuration is provided as-is for the tidigit project.
