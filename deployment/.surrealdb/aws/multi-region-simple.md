# Multi-Region SurrealDB - Simple Approach

**Cost: ~$270/month (3 regions × $90)**

## Architecture

Three independent regional clusters. Users assigned to region at signup and stay there.

```
User Signup → Detect Location → Assign Region → Store in User Profile

us.db.domain.com  ← US users
eu.db.domain.com  ← EU users
asia.db.domain.com ← Asia users
```

---

## Deployment

### 1. Deploy Each Region

```bash
# US-EAST-1
export CLUSTER_NAME=surrealdb-us
export AWS_REGION=us-east-1
cd deployment/surrealdb-aws
./deploy-budget.sh

# EU-WEST-1
export CLUSTER_NAME=surrealdb-eu
export AWS_REGION=eu-west-1
./deploy-budget.sh

# AP-SOUTHEAST-1
export CLUSTER_NAME=surrealdb-asia
export AWS_REGION=ap-southeast-1
./deploy-budget.sh
```

### 2. Get Endpoints

```bash
# Get ALB hostnames from each region
kubectl --context surrealdb-us get ingress surrealdb-tikv -o json | \
  jq -r '.status.loadBalancer.ingress[0].hostname'

kubectl --context surrealdb-eu get ingress surrealdb-tikv -o json | \
  jq -r '.status.loadBalancer.ingress[0].hostname'

kubectl --context surrealdb-asia get ingress surrealdb-tikv -o json | \
  jq -r '.status.loadBalancer.ingress[0].hostname'
```

### 3. Setup DNS (Simple CNAME Records)

In your DNS provider (Cloudflare, AWS Route53, etc.):

```
us.db.domain.com    → CNAME → surrealdb-us-123.us-east-1.elb.amazonaws.com
eu.db.domain.com    → CNAME → surrealdb-eu-456.eu-west-1.elb.amazonaws.com
asia.db.domain.com  → CNAME → surrealdb-asia-789.ap-southeast-1.elb.amazonaws.com
```

**Done!** No geolocation routing needed.

---

## Application Implementation

### User Signup Flow

```typescript
// lib/regions.ts

export const REGIONS = {
  us: {
    name: 'United States',
    endpoint: 'https://us.db.domain.com',
    location: 'Virginia, USA'
  },
  eu: {
    name: 'Europe',
    endpoint: 'https://eu.db.domain.com',
    location: 'Ireland, EU'
  },
  asia: {
    name: 'Asia Pacific',
    endpoint: 'https://asia.db.domain.com',
    location: 'Singapore, Asia'
  }
} as const;

export type Region = keyof typeof REGIONS;

// Auto-detect user's region
export function detectRegion(): Region {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  if (timezone.startsWith('America/')) return 'us';
  if (timezone.startsWith('Europe/') || timezone.startsWith('Africa/')) return 'eu';
  if (timezone.startsWith('Asia/') || timezone.startsWith('Australia/')) return 'asia';
  
  return 'us'; // default
}
```

### Signup Component

```typescript
// components/SignupForm.tsx

import { useState } from 'react';
import { REGIONS, detectRegion } from '@/lib/regions';

export function SignupForm() {
  const [selectedRegion, setSelectedRegion] = useState<Region>(detectRegion());
  
  async function handleSignup(email: string, password: string) {
    // Connect to selected region
    const endpoint = REGIONS[selectedRegion].endpoint;
    const db = new Surreal();
    await db.connect(endpoint);
    
    // Create user account
    const [user] = await db.create('user', {
      email,
      password: await hashPassword(password),
      region: selectedRegion,
      created_at: new Date()
    });
    
    // Store region in user session/profile
    localStorage.setItem('user_region', selectedRegion);
    localStorage.setItem('db_endpoint', endpoint);
    
    return user;
  }
  
  return (
    <form>
      <input type="email" name="email" />
      <input type="password" name="password" />
      
      {/* Region selector */}
      <div>
        <label>Data Region:</label>
        <select 
          value={selectedRegion} 
          onChange={(e) => setSelectedRegion(e.target.value as Region)}
        >
          {Object.entries(REGIONS).map(([key, region]) => (
            <option key={key} value={key}>
              {region.name} ({region.location})
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-600">
          Your data will be stored in {REGIONS[selectedRegion].location}
        </p>
      </div>
      
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

### Login Flow

```typescript
// lib/auth.ts

export async function login(email: string, password: string) {
  // First, need to find which region the user belongs to
  // Option 1: Ask user to select region at login
  // Option 2: Store email→region mapping in a global service
  // Option 3: Try all regions (not recommended)
  
  const region = localStorage.getItem('user_region') as Region || 'us';
  const endpoint = REGIONS[region].endpoint;
  
  const db = new Surreal();
  await db.connect(endpoint);
  
  // Authenticate
  const token = await db.signin({
    namespace: 'production',
    database: 'app',
    scope: 'user',
    email,
    password
  });
  
  return { db, region, token };
}
```

### Global User Registry (Recommended)

Since users need to know their region at login, store email→region mapping globally:

```typescript
// Option A: Small DynamoDB table (cheap)
// users_registry table:
// - email (primary key)
// - region (us/eu/asia)
// - created_at
// Cost: ~$1/month for 1M users (mostly free tier)

async function getUserRegion(email: string): Promise<Region> {
  const result = await dynamodb.getItem({
    TableName: 'users_registry',
    Key: { email }
  });
  
  return result.Item?.region || 'us';
}

// At signup
async function signup(email: string, password: string, region: Region) {
  // 1. Store in registry (DynamoDB)
  await dynamodb.putItem({
    TableName: 'users_registry',
    Item: { email, region, created_at: Date.now() }
  });
  
  // 2. Create user in regional SurrealDB
  const db = new Surreal();
  await db.connect(REGIONS[region].endpoint);
  await db.create('user', { email, password: await hash(password) });
}

// At login
async function login(email: string, password: string) {
  // 1. Lookup region from registry
  const region = await getUserRegion(email);
  
  // 2. Connect to correct regional DB
  const db = new Surreal();
  await db.connect(REGIONS[region].endpoint);
  
  // 3. Authenticate
  await db.signin({
    namespace: 'production',
    database: 'app',
    scope: 'user',
    email,
    password
  });
  
  return { db, region };
}
```

---

## Alternative: Email-based Routing

Store region in the email subdomain or add region hint to login:

```typescript
// Store region in user metadata
// Login form has region selector (remembers last used)

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState<Region>(
    (localStorage.getItem('last_region') as Region) || 'us'
  );
  
  return (
    <form>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input type="password" />
      
      <select 
        value={region} 
        onChange={(e) => {
          const newRegion = e.target.value as Region;
          setRegion(newRegion);
          localStorage.setItem('last_region', newRegion);
        }}
      >
        <option value="us">🇺🇸 United States</option>
        <option value="eu">🇪🇺 Europe</option>
        <option value="asia">🌏 Asia Pacific</option>
      </select>
      
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Database Connection Helper

```typescript
// lib/db.ts

let dbConnection: Surreal | null = null;
let currentRegion: Region | null = null;

export async function getDB(): Promise<Surreal> {
  // Return existing connection if available
  if (dbConnection && currentRegion) {
    return dbConnection;
  }
  
  // Get user's region
  const region = (localStorage.getItem('user_region') as Region) || 'us';
  const endpoint = REGIONS[region].endpoint;
  
  // Create connection
  const db = new Surreal();
  await db.connect(endpoint);
  
  // Try to restore session if token exists
  const token = localStorage.getItem('auth_token');
  if (token) {
    await db.authenticate(token);
  }
  
  dbConnection = db;
  currentRegion = region;
  
  return db;
}

// Usage in your app
export async function createNote(title: string, content: string) {
  const db = await getDB();
  return await db.create('note', { title, content });
}

export async function getNotes() {
  const db = await getDB();
  return await db.select('note');
}
```

---

## User Profile Schema

```sql
-- Store region in user profile
DEFINE TABLE user SCHEMAFULL;
DEFINE FIELD email ON user TYPE string;
DEFINE FIELD password ON user TYPE string;
DEFINE FIELD region ON user TYPE string ASSERT $value IN ['us', 'eu', 'asia'];
DEFINE FIELD created_at ON user TYPE datetime DEFAULT time::now();

DEFINE INDEX email_idx ON user FIELDS email UNIQUE;
```

---

## Cost Breakdown

```
3 Regional Clusters:
  - us-east-1:     $90/month
  - eu-west-1:     $90/month
  - ap-southeast-1: $90/month

DynamoDB (user registry): $1/month
Route53 (3 CNAME records): FREE

────────────────────────────
TOTAL: ~$271/month
```

**Savings vs geo-routing:** ~$50/month (no Route53 geolocation, no health checks)

---

## Migration Between Regions (If Needed)

If a user wants to move regions:

```typescript
async function migrateUserRegion(
  userId: string, 
  fromRegion: Region, 
  toRegion: Region
) {
  // 1. Connect to source region
  const sourceDB = new Surreal();
  await sourceDB.connect(REGIONS[fromRegion].endpoint);
  
  // 2. Export user data
  const userData = await sourceDB.select(`user:${userId}`);
  const notes = await sourceDB.query(
    `SELECT * FROM note WHERE user = $userId`,
    { userId }
  );
  const tasks = await sourceDB.query(
    `SELECT * FROM task WHERE user = $userId`,
    { userId }
  );
  
  // 3. Connect to destination region
  const destDB = new Surreal();
  await destDB.connect(REGIONS[toRegion].endpoint);
  
  // 4. Import data
  await destDB.create(`user:${userId}`, { ...userData, region: toRegion });
  for (const note of notes) {
    await destDB.create(`note:${note.id}`, note);
  }
  for (const task of tasks) {
    await destDB.create(`task:${task.id}`, task);
  }
  
  // 5. Update registry
  await dynamodb.updateItem({
    TableName: 'users_registry',
    Key: { email: userData.email },
    UpdateExpression: 'SET region = :region',
    ExpressionAttributeValues: { ':region': toRegion }
  });
  
  // 6. Delete from source (optional)
  await sourceDB.delete(`user:${userId}`);
}
```

---

## Summary

✅ **No geo-routing needed** - Just direct CNAME records  
✅ **Region assigned at signup** - Stored in user profile  
✅ **Simple login** - User's browser remembers region  
✅ **Cheaper** - Saves ~$50/month on Route53  
✅ **Easy to understand** - No complex DNS rules  

**Total Cost: $271/month for global presence!**
