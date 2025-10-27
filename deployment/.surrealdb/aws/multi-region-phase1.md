# Multi-Region SurrealDB Deployment - Phase 1

**Target: 100-1K users | Cost: ~$320/month**

## Architecture Overview

Three **independent** regional clusters with GeoDNS routing. No cross-region replication to minimize costs.

```
                    ┌─────────────────┐
                    │   Route53 DNS   │
                    │  (GeoDNS)       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
         │ US-EAST │    │ EU-WEST │   │ AP-SE   │
         └─────────┘    └─────────┘   └─────────┘
```

## Regional Clusters

### US-East-1 (Virginia)

```bash
export CLUSTER_NAME=surrealdb-us
export AWS_REGION=us-east-1

# Deploy using budget config
cd deployment/surrealdb-aws
./deploy-budget.sh
```

**Endpoints:**
- SurrealDB: `us.surrealdb.yourdomain.com`
- Cost: ~$90/month

---

### EU-West-1 (Ireland)

```bash
export CLUSTER_NAME=surrealdb-eu
export AWS_REGION=eu-west-1

# Deploy using budget config
cd deployment/surrealdb-aws
./deploy-budget.sh
```

**Endpoints:**
- SurrealDB: `eu.surrealdb.yourdomain.com`
- Cost: ~$90/month

---

### AP-Southeast-1 (Singapore)

```bash
export CLUSTER_NAME=surrealdb-asia
export AWS_REGION=ap-southeast-1

# Deploy using budget config
cd deployment/surrealdb-aws
./deploy-budget.sh
```

**Endpoints:**
- SurrealDB: `asia.surrealdb.yourdomain.com`
- Cost: ~$90/month

---

## Route53 Geolocation Setup

### 1. Create Hosted Zone

```bash
aws route53 create-hosted-zone \
  --name surrealdb.yourdomain.com \
  --caller-reference "surrealdb-$(date +%s)"
```

### 2. Get ALB Endpoints

```bash
# US
export US_ENDPOINT=$(kubectl get ingress surrealdb-tikv \
  --context=arn:aws:eks:us-east-1:ACCOUNT:cluster/surrealdb-us \
  -o json | jq -r '.status.loadBalancer.ingress[0].hostname')

# EU
export EU_ENDPOINT=$(kubectl get ingress surrealdb-tikv \
  --context=arn:aws:eks:eu-west-1:ACCOUNT:cluster/surrealdb-eu \
  -o json | jq -r '.status.loadBalancer.ingress[0].hostname')

# Asia
export ASIA_ENDPOINT=$(kubectl get ingress surrealdb-tikv \
  --context=arn:aws:eks:ap-southeast-1:ACCOUNT:cluster/surrealdb-asia \
  -o json | jq -r '.status.loadBalancer.ingress[0].hostname')
```

### 3. Create Geolocation Records

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.surrealdb.yourdomain.com",
        "Type": "CNAME",
        "SetIdentifier": "US-East",
        "GeoLocation": {
          "ContinentCode": "NA"
        },
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "${US_ENDPOINT}"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.surrealdb.yourdomain.com",
        "Type": "CNAME",
        "SetIdentifier": "EU-West",
        "GeoLocation": {
          "ContinentCode": "EU"
        },
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "${EU_ENDPOINT}"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.surrealdb.yourdomain.com",
        "Type": "CNAME",
        "SetIdentifier": "Asia-Pacific",
        "GeoLocation": {
          "ContinentCode": "AS"
        },
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "${ASIA_ENDPOINT}"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.surrealdb.yourdomain.com",
        "Type": "CNAME",
        "SetIdentifier": "Default",
        "GeoLocation": {
          "ContinentCode": "*"
        },
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "${US_ENDPOINT}"
          }
        ]
      }
    }
  ]
}
```

---

## Application Configuration

### Client-Side Region Detection

```typescript
// lib/surrealdb.ts

const REGION_ENDPOINTS = {
  us: 'https://us.surrealdb.yourdomain.com',
  eu: 'https://eu.surrealdb.yourdomain.com',
  asia: 'https://asia.surrealdb.yourdomain.com',
};

function detectUserRegion(): 'us' | 'eu' | 'asia' {
  // Get from user preferences (stored after first visit)
  const savedRegion = localStorage.getItem('preferred_region');
  if (savedRegion) return savedRegion as any;
  
  // Detect from timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone.startsWith('America/')) return 'us';
  if (timezone.startsWith('Europe/')) return 'eu';
  if (timezone.startsWith('Asia/')) return 'asia';
  
  return 'us'; // default
}

export async function connectSurrealDB() {
  const region = detectUserRegion();
  const endpoint = REGION_ENDPOINTS[region];
  
  const db = new Surreal();
  await db.connect(endpoint);
  
  // Store region for future use
  localStorage.setItem('preferred_region', region);
  localStorage.setItem('db_endpoint', endpoint);
  
  return db;
}
```

### Server-Side Region Selection

```typescript
// server/routes/api.ts

import { headers } from 'next/headers';

function getRegionFromIP(ip: string): string {
  // Use CloudFront or CloudFlare headers
  const cfCountry = headers().get('cf-ipcountry');
  const awsRegion = headers().get('cloudfront-viewer-country');
  
  const country = cfCountry || awsRegion;
  
  // Map country to region
  if (['US', 'CA', 'MX', 'BR'].includes(country)) return 'us';
  if (['GB', 'DE', 'FR', 'IT', 'ES'].includes(country)) return 'eu';
  if (['IN', 'CN', 'JP', 'SG', 'AU'].includes(country)) return 'asia';
  
  return 'us';
}

export async function POST(request: Request) {
  const clientIP = request.headers.get('x-forwarded-for');
  const region = getRegionFromIP(clientIP);
  
  // Connect to regional database
  const db = new Surreal();
  await db.connect(REGION_ENDPOINTS[region]);
  
  // Process request...
}
```

---

## Data Strategy

### What Stays Regional

✅ **User-specific data** (majority of data):
- Notes (Memotron)
- Tasks (Pointron)
- Personal settings
- User documents

**Why:** Performance + cost + GDPR compliance

### What Syncs Globally (Optional)

🔄 **Shared/public data** (small subset):
- Public templates
- Shared workspaces
- Team collaboration data

**How:** Application-level replication via queue:

```typescript
// When creating shared content
async function createSharedNote(note: Note) {
  // Write to local region
  await localDB.create('shared_note', note);
  
  // Replicate to other regions (async)
  await queue.add('replicate-global', {
    type: 'shared_note',
    id: note.id,
    data: note,
    regions: ['us', 'eu', 'asia'].filter(r => r !== currentRegion)
  });
}
```

---

## Monitoring & Costs

### CloudWatch Dashboard

```bash
# Create monitoring stack
aws cloudformation create-stack \
  --stack-name surrealdb-monitoring \
  --template-body file://monitoring-template.yaml \
  --parameters \
    ParameterKey=USClusterName,ParameterValue=surrealdb-us \
    ParameterKey=EUClusterName,ParameterValue=surrealdb-eu \
    ParameterKey=AsiaClusterName,ParameterValue=surrealdb-asia
```

### Cost Alerts

```bash
# Set up budget alerts for each region
for region in us-east-1 eu-west-1 ap-southeast-1; do
  aws budgets create-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget '{
      "BudgetName": "surrealdb-'$region'",
      "BudgetLimit": {
        "Amount": "120",
        "Unit": "USD"
      },
      "TimeUnit": "MONTHLY",
      "BudgetType": "COST"
    }' \
    --region $region
done
```

---

## Migration Path

### Phase 1 → Phase 2 (Multi-AZ)

When you hit 1K users in a region:

```bash
# Update cluster config to multi-AZ
cd deployment/surrealdb-aws
export CLUSTER_NAME=surrealdb-us
export AWS_REGION=us-east-1

# Use phase2 config
./deploy-phase2.sh
```

No data migration needed - TiKV handles it automatically.

### Phase 2 → Phase 3 (Cross-Region)

When you need global data:

1. Set up replication queues (SQS/Redis)
2. Implement sync workers
3. Gradually enable for shared data
4. Monitor cross-region costs

---

## Cost Tracking

| Phase | Users | Monthly Cost | Per User |
|-------|-------|--------------|----------|
| **Phase 1** | 100-1K | $320 | $0.32-3.20 |
| **Phase 2** | 1K-10K | $850 | $0.09-0.85 |
| **Phase 3** | 10K-100K | $4,500 | $0.05-0.45 |

**Start cheap, scale when needed!**
