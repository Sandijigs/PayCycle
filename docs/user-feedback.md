# PayCycle — User Feedback Report

Collected via the in-app feedback form at `/feedback`, backed by the PayCycle API.

---

## Feedback Questions

1. **Ease of use** — How easy was it to create a plan or subscribe? (1-5)
2. **Trust** — Do you trust the pre-authorized payment model? (1-5)
3. **Transaction speed** — How was the transaction speed? (1-5)
4. **Missing for mainnet** — What feature is missing that would make you use this on mainnet?
5. **Bugs / UX issues** — Any bugs or confusing UX?

---

## Responses

| # | User | Ease (1-5) | Trust (1-5) | Speed (1-5) | Missing Feature | Bugs / UX Issues |
|---|------|------------|-------------|-------------|-----------------|------------------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |

> **Note:** Responses are collected via the backend API (`POST /api/feedback`) and stored in SQLite. This table should be populated from actual responses as they come in. User column shows truncated wallet address or "anonymous".

---

## Aggregate Scores

| Question | Average | Min | Max |
|----------|---------|-----|-----|
| Ease of use | — | — | — |
| Trust | — | — | — |
| Transaction speed | — | — | — |

---

## Common Themes

### Most Requested Features
1. TODO
2. TODO
3. TODO

### Most Reported Issues
1. TODO
2. TODO

---

## Iteration Based on Feedback

### Issue Identified
**Most common issue:** TODO

**User quotes:**
- "..." — User #X
- "..." — User #Y

### What We Changed
**Before:** TODO

**After:** TODO

**Commit:** TODO

### Result
TODO — describe improvement, e.g. "Reduced subscribe flow from 5 clicks to 3" or "Added missing error message for insufficient balance"

---

## How to Collect Feedback

### In-App Form
Users can submit feedback at any time via the **Give Feedback** page (`/feedback`). The form collects:
- Star ratings (1-5) for ease, trust, and speed
- Free-text for missing features and bugs
- Wallet address is auto-attached if connected

### Retrieving Feedback
```bash
# List all feedback from the API
curl https://your-backend-url/api/feedback

# With pagination
curl https://your-backend-url/api/feedback?limit=10&offset=0
```

### Manual Collection
If users prefer not to use the in-app form, collect feedback via:
- Discord DMs
- X/Twitter replies
- Google Form (backup)

Document all responses in the table above regardless of collection method.
