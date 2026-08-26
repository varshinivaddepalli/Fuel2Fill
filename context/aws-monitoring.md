# AWS Monitoring Guide for Petro Astra V1

## Context
Petro Astra has:
- **Frontend**: Next.js SSR on **AWS Amplify Hosting**
- **Backend**: FastAPI on **AWS Lambda**
- **Database**: Supabase (external)

This guide provides full visibility into costs, performance, usage limits, and the underlying AWS services.

---

## 1. What AWS Services Amplify Uses Under the Hood

When you deploy a Next.js SSR app on Amplify, it silently provisions:

| Hidden Service | What It Does | Where to See It |
|---|---|---|
| **Amazon CloudFront** | CDN - serves your static assets + routes SSR requests | CloudFront console (look for distributions tagged with your Amplify app) |
| **AWS Lambda** (or Lambda@Edge) | Runs your Next.js SSR/ISR/API routes server-side | Lambda console (auto-created functions with `amplify` in the name) |
| **Amazon S3** | Stores your static build artifacts (.next/static, public/) | S3 console (bucket named after your Amplify app) |
| **AWS WAF** (optional) | Web Application Firewall if you enabled it | WAF console |
| **Amazon Route 53** | DNS if you connected a custom domain | Route 53 console |
| **AWS Certificate Manager** | SSL/TLS cert for your custom domain | ACM console |

**Key insight**: Amplify abstracts these away, but **you're billed for them individually**. The Amplify pricing page shows simplified pricing, but understanding the underlying services helps you optimize.

---

## 2. Where to Monitor (Service by Service)

### A. AWS Amplify Console
**Location**: AWS Console > Amplify > Your App

What to check:
- **Build history** - Build times, success/failure, build minutes consumed
- **Hosting > Monitoring** - Request count, data transfer, 4xx/5xx errors
- **Build notifications** - Set up email/Slack alerts for failed builds

**Free tier**: 1000 build minutes/month, 15 GB served/month, 5 GB stored

### B. Amazon CloudWatch (MOST IMPORTANT)
**Location**: AWS Console > CloudWatch

This is your **central monitoring hub**. Both Amplify and Lambda push metrics here.

**Amplify/CloudFront metrics to watch:**
- `Requests` - Total requests to your app
- `BytesDownloaded` - Data transfer out (this is what costs money)
- `4xxErrorRate` / `5xxErrorRate` - Client and server errors
- `CacheHitRate` - Higher = less Lambda invocations = lower cost

**Lambda metrics to watch (for both Amplify SSR + your FastAPI):**
- `Invocations` - Number of function calls
- `Duration` - How long each request takes (you're billed per ms)
- `Errors` - Failed invocations
- `Throttles` - Requests rejected due to concurrency limits
- `ConcurrentExecutions` - How many running at once
- `ColdStarts` - Not a native metric, but visible in logs (search for "Init Duration")

**Set up CloudWatch Alarms for:**
```
- 5xx error rate > 5% for 5 minutes
- Lambda duration > 10 seconds (your timeout approaching)
- Throttles > 0 (you're hitting concurrency limits)
- Monthly estimated charges > your budget
```

### C. AWS Cost Explorer
**Location**: AWS Console > Billing > Cost Explorer

**What to check:**
- Filter by service: "AWS Amplify", "AWS Lambda", "Amazon CloudFront", "Amazon S3"
- Group by: "Usage Type" to see exactly what you're being charged for
- Set **daily granularity** to catch cost spikes early

**Common Amplify cost components:**

| Cost Item | What Drives It | Free Tier |
|---|---|---|
| Build minutes | Every deploy triggers a build | 1,000 min/month |
| Hosting (data served) | Every page load transfers data | 15 GB/month |
| Hosting (data stored) | Your .next build output size | 5 GB/month |
| SSR requests | Lambda invocations for server-rendered pages | Covered by Lambda free tier (1M requests/month) |

**Common Lambda cost components (your FastAPI backend):**

| Cost Item | What Drives It | Free Tier |
|---|---|---|
| Requests | Every API call from frontend | 1M requests/month |
| Duration | Time * memory allocated | 400,000 GB-seconds/month |

### D. AWS Budgets (SET THIS UP NOW)
**Location**: AWS Console > Billing > Budgets

Create these budgets immediately:
1. **Monthly total budget** - e.g., $10/month with alert at 80%
2. **Per-service budget** - Separate budgets for Amplify and Lambda
3. **Anomaly detection** - AWS can auto-detect unusual spending

Alerts can go to email or SNS (which can trigger Slack/Teams).

### E. AWS Lambda Console (for your FastAPI backend specifically)
**Location**: AWS Console > Lambda > Your FastAPI function

Check the **Monitor** tab for:
- Invocation count
- Error count and success rate
- Duration (avg, p99)
- Throttles
- Concurrent executions

**Tip**: Click "View CloudWatch logs" to see actual request/response logs.

---

## 3. Practical Monitoring Setup (Recommended Steps)

### Step 1: Enable Billing Alerts
```
AWS Console > Billing > Billing Preferences > Check "Receive Free Tier Usage Alerts"
AWS Console > Billing > Budgets > Create Budget > $10 monthly with 50%, 80%, 100% alerts
```

### Step 2: Create a CloudWatch Dashboard
Create a single dashboard with widgets for:
- Amplify: Request count, error rates, data transfer
- Lambda (FastAPI): Invocations, duration p99, errors, throttles
- Billing: Estimated monthly charges

### Step 3: Set Up Alarms
Priority alarms:
1. **Billing alarm**: Monthly charges exceed threshold
2. **Error alarm**: 5xx rate spikes
3. **Lambda throttle alarm**: Any throttling occurring
4. **Duration alarm**: Lambda approaching timeout

### Step 4: Check Weekly
Spend 5 minutes weekly reviewing:
- Cost Explorer (any unexpected charges?)
- CloudWatch dashboard (any error spikes?)
- Amplify build history (builds staying fast?)

---

## 4. Common Gotchas with Amplify + Lambda

| Gotcha | Why It Matters |
|---|---|
| **SSR = Lambda invocations** | Every server-rendered page is a Lambda call. More traffic = more cost. Use ISR/static where possible. |
| **Cold starts** | First request after idle period is slow (1-3s). Affects UX. Use provisioned concurrency if critical. |
| **Build minutes add up** | Every `git push` to your branch triggers a build. If you push 20 times/day during dev, that's ~200 min/day. |
| **Data transfer costs** | CloudFront data transfer is $0.085/GB after free tier. Large pages/assets add up. |
| **Lambda memory = cost** | Higher memory allocation = faster but more expensive. Right-size it. |
| **Preview branches** | If enabled, each PR creates a new deployment. Disable if not needed. |

---

## 5. Quick Reference: All AWS Consoles to Bookmark

1. **Amplify Console** - Builds, deployments, domain management
2. **CloudWatch** - Metrics, logs, alarms, dashboards
3. **Cost Explorer** - Cost breakdown and trends
4. **Budgets** - Spending alerts
5. **Lambda Console** - Your FastAPI function monitoring
6. **CloudFront Console** - CDN cache stats (usually managed by Amplify)
7. **S3 Console** - Storage used by build artifacts

---

## 6. Useful CLI Commands

```bash
# Check Amplify app status
aws amplify list-apps

# Get recent builds
aws amplify list-jobs --app-id YOUR_APP_ID --branch-name main

# Check Lambda function config
aws lambda get-function --function-name YOUR_FUNCTION_NAME

# Get Lambda invocation metrics (last 24h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=YOUR_FUNCTION_NAME \
  --start-time $(date -u -v-1d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Check current month's estimated bill
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## Summary

**The 3 most important things to do right now:**
1. **Set up AWS Budgets** with email alerts (takes 2 minutes)
2. **Create a CloudWatch Dashboard** combining Amplify + Lambda metrics
3. **Bookmark Cost Explorer** and check it weekly

This is an informational guide - no code changes needed to your Petro Astra codebase.
