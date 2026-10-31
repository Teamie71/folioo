## Infrastructure Cost Estimate (Monthly)

Currency: USD/month
Region baseline: GCP `asia-northeast3`

### Assumptions

- Low: MVP/dev traffic
- Expected: regular production traffic
- High: higher request volume and log/egress growth
- 730 hours/month uptime

### Line Items

| Category      | Service             | Low | Expected | High | Notes                                                       |
| ------------- | ------------------- | --: | -------: | ---: | ----------------------------------------------------------- |
| Compute       | GCE VM(s)           |  30 |       60 |  140 | Depends on machine size/count                               |
| Registry      | Artifact Registry   |   1 |        3 |   10 | Image storage + pull operations                             |
| Network       | GCP egress          |   0 |        8 |   35 | Varies by traffic and cache hit                             |
| Tunnel/CDN    | Cloudflare Tunnel   |   0 |        0 |    0 | Free tier baseline                                          |
| Database      | Supabase (external) |   0 |       25 |   75 | Free tier → Pro plan; storage and API call volume dependent |
| Observability | Cloud Logging, etc. |   0 |        5 |   20 | Log ingestion/retention dependent                           |

### Total

- Low: ~31
- Expected: ~76
- High: ~225

### Cost Drivers

- Compute instance sizing/count
- Egress volume (especially cache misses)
- DB storage/backup growth

### Review cadence

- Re-check monthly with billing export/dashboard
- Update this sheet when machine class, region, or plan changes
