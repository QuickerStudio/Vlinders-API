# Deployment Guide

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Node.js 18+ and npm

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Create Required Resources

#### D1 Database

```bash
# Create production database
npx wrangler d1 create vlinders-db

# Create development database (optional)
npx wrangler d1 create vlinders-db-dev
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vlinders-db"
database_id = "your-database-id-here"
```

#### KV Namespaces

```bash
# Create production KV namespaces
npx wrangler kv:namespace create "CACHE"
npx wrangler kv:namespace create "SESSIONS"
npx wrangler kv:namespace create "RATE_LIMIT"

# Create preview namespaces for development
npx wrangler kv:namespace create "CACHE" --preview
npx wrangler kv:namespace create "SESSIONS" --preview
npx wrangler kv:namespace create "RATE_LIMIT" --preview
```

Update `wrangler.toml` with the namespace IDs:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-namespace-id"
preview_id = "your-cache-preview-id"

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-sessions-namespace-id"
preview_id = "your-sessions-preview-id"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-rate-limit-namespace-id"
preview_id = "your-rate-limit-preview-id"
```

#### R2 Buckets

```bash
# Create R2 buckets
npx wrangler r2 bucket create vlinders-images
npx wrangler r2 bucket create vlinders-logs
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "vlinders-images"

[[r2_buckets]]
binding = "LOGS_BUCKET"
bucket_name = "vlinders-logs"
```

### 4. Configure Environment Variables

Create secrets for sensitive data:

```bash
# JWT secret (generate a secure random string)
npx wrangler secret put JWT_SECRET

# Admin credentials (optional)
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
```

Update `wrangler.toml` with non-sensitive environment variables:

```toml
[vars]
ENVIRONMENT = "production"
API_VERSION = "1.0.0"
CORS_ORIGINS = "https://vlinders.app,https://www.vlinders.app"
```

### 5. Initialize Database Schema

```bash
# Apply migrations to production database
npx wrangler d1 migrations apply vlinders-db

# For development database
npx wrangler d1 migrations apply vlinders-db-dev --local
```

## Deployment

### Development

Run locally with hot reload:

```bash
npm run dev
```

This starts the worker at `http://localhost:8787`.

### Production

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Your API will be available at `https://vlinders-api.<your-subdomain>.workers.dev`.

## Custom Domain Setup

### 1. Add Custom Domain

In the Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Go to Settings > Triggers
4. Click "Add Custom Domain"
5. Enter your domain (e.g., `api.vlinders.app`)

### 2. Update CORS Origins

Update `wrangler.toml` to include your custom domain:

```toml
[vars]
CORS_ORIGINS = "https://vlinders.app,https://api.vlinders.app"
```

Redeploy:

```bash
npm run deploy
```

## Database Management

### Run Migrations

```bash
# Production
npx wrangler d1 migrations apply vlinders-db

# Development
npx wrangler d1 migrations apply vlinders-db-dev --local
```

### Execute SQL Queries

```bash
# Production
npx wrangler d1 execute vlinders-db --command "SELECT * FROM users LIMIT 10"

# Development
npx wrangler d1 execute vlinders-db-dev --local --command "SELECT * FROM users LIMIT 10"
```

### Backup Database

```bash
# Export database
npx wrangler d1 export vlinders-db --output backup.sql

# Import database
npx wrangler d1 execute vlinders-db --file backup.sql
```

## Monitoring and Logs

### View Logs

```bash
# Tail production logs
npx wrangler tail

# Filter by status
npx wrangler tail --status error
```

### Access Metrics

View metrics in the Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your worker
3. View Analytics tab

### Query R2 Logs

Logs are stored in R2 bucket `vlinders-logs` organized by date:

```
logs/
  2026-02-28/
    1709125200000.json
    1709125500000.json
```

Download logs:

```bash
npx wrangler r2 object get vlinders-logs/logs/2026-02-28/1709125200000.json
```

## Environment-Specific Configuration

### Development Environment

```toml
[env.dev]
name = "vlinders-api-dev"
vars = { ENVIRONMENT = "development" }

[[env.dev.d1_databases]]
binding = "DB"
database_name = "vlinders-db-dev"
database_id = "your-dev-database-id"
```

Deploy to development:

```bash
npx wrangler deploy --env dev
```

### Staging Environment

```toml
[env.staging]
name = "vlinders-api-staging"
vars = { ENVIRONMENT = "staging" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "vlinders-db-staging"
database_id = "your-staging-database-id"
```

Deploy to staging:

```bash
npx wrangler deploy --env staging
```

## Security Best Practices

### 1. Rotate Secrets Regularly

```bash
# Generate new JWT secret
npx wrangler secret put JWT_SECRET

# Update admin credentials
npx wrangler secret put ADMIN_PASSWORD
```

### 2. Configure Rate Limits

Adjust rate limits in `wrangler.toml`:

```toml
[vars]
RATE_LIMIT_ANONYMOUS = "100"
RATE_LIMIT_AUTHENTICATED = "1000"
RATE_LIMIT_WINDOW = "900" # 15 minutes in seconds
```

### 3. Enable CORS Restrictions

Only allow trusted origins:

```toml
[vars]
CORS_ORIGINS = "https://vlinders.app"
```

### 4. Monitor Error Rates

Set up alerts in Cloudflare dashboard for:
- High error rates (>5%)
- Increased latency (>1000ms p95)
- Rate limit violations

## Troubleshooting

### Database Connection Issues

```bash
# Check database status
npx wrangler d1 info vlinders-db

# Test connection
npx wrangler d1 execute vlinders-db --command "SELECT 1"
```

### KV Namespace Issues

```bash
# List all keys
npx wrangler kv:key list --namespace-id=your-namespace-id

# Get specific key
npx wrangler kv:key get "key-name" --namespace-id=your-namespace-id
```

### R2 Bucket Issues

```bash
# List buckets
npx wrangler r2 bucket list

# List objects in bucket
npx wrangler r2 object list vlinders-images
```

### Worker Not Responding

1. Check worker status in dashboard
2. View recent logs: `npx wrangler tail`
3. Check for deployment errors: `npx wrangler deployments list`
4. Rollback if needed: `npx wrangler rollback`

## Performance Optimization

### 1. Enable Caching

Cache responses in KV:

```typescript
// Already implemented in src/middleware/cache.ts
```

### 2. Optimize Database Queries

- Use indexes for frequently queried columns
- Limit result sets with pagination
- Use prepared statements

### 3. Compress Responses

Enable compression in `wrangler.toml`:

```toml
[vars]
ENABLE_COMPRESSION = "true"
```

### 4. Use R2 for Large Files

Store images and files in R2 instead of D1:

```typescript
// Already implemented in src/storage/images.ts
```

## Scaling Considerations

### Database Limits

- D1 database size: 10 GB per database
- Queries per day: 50 million reads, 5 million writes
- Consider sharding for larger datasets

### KV Limits

- Key size: 512 bytes
- Value size: 25 MB
- Operations per day: Unlimited reads, 1 million writes

### R2 Limits

- Object size: 5 TB
- Operations: Unlimited
- Storage: Unlimited

### Worker Limits

- CPU time: 50ms per request (can be increased)
- Memory: 128 MB
- Concurrent requests: Unlimited

## Backup and Recovery

### Automated Backups

Set up automated backups using Cloudflare's backup features or create a scheduled worker:

```bash
# Create backup worker
npx wrangler init backup-worker
```

### Manual Backup

```bash
# Backup database
npx wrangler d1 export vlinders-db --output backup-$(date +%Y%m%d).sql

# Backup KV namespace
npx wrangler kv:key list --namespace-id=your-id > kv-backup.json
```

### Recovery

```bash
# Restore database
npx wrangler d1 execute vlinders-db --file backup-20260228.sql

# Restore KV keys
# Use custom script to restore from kv-backup.json
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/vlinders-api/issues
- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Cloudflare Community: https://community.cloudflare.com/
