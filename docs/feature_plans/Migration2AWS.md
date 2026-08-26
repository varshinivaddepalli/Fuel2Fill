# AWS Hosting Cost Estimate for Petro Astra V1

*Generated: February 2026*

## Application Architecture Summary

| Component | Technology | AWS Equivalent |
|-----------|-----------|----------------|
| Frontend | Next.js 16 (SSR) | AWS Amplify / ECS Fargate |
| Backend | FastAPI + Python + LangGraph | ECS Fargate |
| Database | PostgreSQL | RDS PostgreSQL / Keep Supabase |
| Storage | Images (employee/client photos, OCR docs) | S3 |
| Auth | Supabase Auth | AWS Cognito / Keep Supabase |
| AI APIs | Groq + Mistral | External (no AWS equivalent) |

---

## Scenario 1: Full AWS Migration (Small Scale)

For a startup with **1-5 fuel stations**, ~50 employees, moderate usage:

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **Frontend (Amplify)** | Next.js SSR, ~10K requests/day | **$15-30** |
| **Backend (ECS Fargate)** | 0.5 vCPU, 1GB RAM, 24/7 | **$18-25** |
| **Database (RDS PostgreSQL)** | db.t4g.micro, 20GB SSD, Single-AZ | **$15-20** |
| **S3 Storage** | ~5GB images, 1000 requests/day | **$1-2** |
| **Cognito** | <50K MAU (free tier) | **$0** |
| **CloudWatch (Logs/Metrics)** | Basic monitoring | **$5-10** |
| **Data Transfer** | ~50GB/month outbound | **$4-5** |
| **Total AWS** | | **$58-92/month** |

### External API Costs (Not AWS):

| Service | Usage Estimate | Monthly Cost |
|---------|---------------|--------------|
| **Groq API (Ask Astra)** | ~100K tokens/day (llama-3.3-70b-versatile) | **$3-5** |
| **Mistral OCR (Click Astra)** | ~500 pages/month | **$1** |
| **Grand Total** | | **$62-98/month** |

---

## Scenario 2: Hybrid (Keep Supabase + AWS Backend)

Keep Supabase for DB/Auth/Storage, only move compute to AWS:

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **Supabase Pro** | DB + Auth + 8GB storage | **$25** |
| **Frontend (Amplify)** | Next.js SSR | **$15-30** |
| **Backend (ECS Fargate)** | 0.5 vCPU, 1GB RAM | **$18-25** |
| **CloudWatch** | Basic | **$5** |
| **Total** | | **$63-85/month** |

Plus Groq/Mistral APIs: **$4-6/month**

**Grand Total: $67-91/month**

---

## Scenario 3: Medium Scale (10-20 stations)

For ~200 employees, higher traffic:

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **Frontend (Amplify)** | Next.js SSR, ~50K requests/day | **$50-100** |
| **Backend (ECS Fargate)** | 1 vCPU, 2GB RAM × 2 tasks | **$80-120** |
| **Database (RDS PostgreSQL)** | db.t4g.small, 50GB, Multi-AZ | **$50-80** |
| **S3 Storage** | 20GB, higher requests | **$5-10** |
| **ElastiCache (optional)** | Redis for sessions | **$15-25** |
| **CloudWatch** | Enhanced monitoring | **$15-20** |
| **Data Transfer** | 200GB/month | **$18** |
| **Total AWS** | | **$233-373/month** |

Plus Groq/Mistral: **$20-50/month** (higher usage)

**Grand Total: $250-420/month**

---

## Scenario 4: Cost-Optimized (EC2)

Single EC2 instance running everything (best for dev/small prod):

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **EC2** | t4g.small (2 vCPU, 2GB), reserved 1yr | **$8-12** |
| **RDS PostgreSQL** | db.t4g.micro, reserved | **$8-10** |
| **S3** | 5GB | **$1** |
| **ALB** | Application Load Balancer | **$16-20** |
| **Data Transfer** | 50GB | **$5** |
| **Total** | | **$38-48/month** |

Plus APIs: **$4-6/month**

**Grand Total: $42-54/month**

---

## Detailed Pricing Breakdown

### AWS Fargate
- vCPU: **$0.04656/hour** (US regions)
- Memory: **$0.00511/GB-hour**
- 0.5 vCPU + 1GB running 24/7 = ~$18/month

### RDS PostgreSQL
- db.t4g.micro: **$0.016/hour** = ~$11.50/month
- Storage: **$0.115/GB-month**
- Free tier: 750 hours/month for 12 months

### S3 Storage
- Standard: **$0.023/GB-month** (first 50TB)
- Requests: **$0.0004/1000 GET**, **$0.005/1000 PUT**

### AWS Amplify
- Build: **$0.01/build-minute**
- Hosting: **$0.15/GB served**, **$0.023/GB stored**
- SSR compute: Additional charges apply

### External APIs
- **Groq**: $0.59/M input tokens, $0.79/M output tokens (llama-3.3-70b-versatile)
- **Mistral OCR**: $1-2 per 1,000 pages

---

## Recommended Setup for Petro Astra V1

Based on the current architecture, **Scenario 2 (Hybrid)** is recommended initially:

```
Estimated Monthly Cost: $70-100/month
```

**Reasons:**
1. **Supabase** already handles DB + Auth + RLS policies + Storage well
2. **AWS Amplify** for Next.js with automatic CI/CD
3. **ECS Fargate** for FastAPI backend (auto-scaling, no server management)
4. Lower migration complexity - keep what works

### Scale-Up Path:
- As usage grows, switch to **Scenario 3** with RDS Multi-AZ
- Consider **Fargate Spot** for 70% discount on interruptible workloads
- Use **Savings Plans** for 50% discount with 1-year commitment

---

## Cost Comparison: Supabase vs Full AWS

| | Supabase Pro + External Compute | Full AWS |
|---|---|---|
| DB + Auth + Storage | $25 (included) | $35-50 |
| Ease of setup | High | Medium |
| Flexibility | Medium | High |
| RLS policies | Built-in | Manual implementation |
| **Best for** | MVP to mid-scale | Enterprise scale |

---

## Summary Table

| Scale | Monthly Estimate | Best Option |
|-------|-----------------|-------------|
| **Small (1-5 stations)** | **$60-100** | Hybrid (Supabase + Amplify + Fargate) |
| **Medium (10-20 stations)** | **$250-420** | Full AWS with RDS |
| **Cost-Optimized (Dev)** | **$42-54** | Single EC2 |
| **Large (50+ stations)** | **$800-1500+** | Full AWS with reserved instances |

---

## AWS Free Tier Benefits (First 12 Months)

- **EC2**: 750 hours/month of t2.micro or t3.micro
- **RDS**: 750 hours/month of db.t2.micro or db.t3.micro, 20GB storage
- **S3**: 5GB standard storage, 20,000 GET, 2,000 PUT requests
- **Lambda**: 1M requests/month, 400,000 GB-seconds compute
- **CloudWatch**: 10 custom metrics, 10 alarms
- **Cognito**: 50,000 MAUs (always free)

---

## References

- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [AWS RDS PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [AWS Amplify Pricing](https://aws.amazon.com/amplify/pricing/)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [AWS Pricing Calculator](https://calculator.aws/)
- [Groq API Pricing](https://groq.com/pricing)
- [Mistral AI Pricing](https://mistral.ai/pricing)
