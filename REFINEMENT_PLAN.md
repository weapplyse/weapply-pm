# Weapply PM - Refinement Rules & Categorization Plan

## Current Flow (Working ✅)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Email arrives at pm@weapply.se                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Forwarded to Linear intake email                            │
│     → Linear creates ticket in WeTest team                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Linear webhook triggers                                     │
│     → POST https://pm.weapply.se/webhook/linear-webhook         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AI Refinement (OpenAI GPT-4o-mini)                          │
│     → Clean title (remove Fwd:/Re:, make actionable)            │
│     → Structured description (Summary, Action Items, Details)   │
│     → Assign labels (Type, Area, Owner)                         │
│     → Set priority (1-4)                                        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Update Linear ticket via API                                │
│     → Title, description, labels, priority                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Label Categories (WeTest Team)

### Type Labels (Pick ONE - Required)
| Label | When to use |
|-------|-------------|
| **Bug** | Something broken, errors, not working as expected |
| **Feature** | New functionality request |
| **Improvement** | Enhancement to existing feature |
| **Task** | General work item, maintenance |
| **Research** | Investigation, analysis needed |
| **Epic** | Large multi-ticket initiative |
| **Change request** | Modification to existing behavior |

### Tech Area Labels (Pick ONE if relevant)
| Label | When to use |
|-------|-------------|
| **Frontend** | UI, React, browser-related |
| **Backend** | API, server, business logic |
| **Database** | PostgreSQL, data issues |
| **Admin** | Admin panel related |
| **API** | API endpoints, integrations |
| **Devops** | Infrastructure, deployments |
| **UX/UI** | Design, user experience |

### Owner Labels (Pick ONE if determinable)
| Label | Description |
|-------|-------------|
| **Software** | WeApply team |
| **Production** | Shortlink + Cikoria |
| **Hardware** | Shortlink |
| **Embedded** | Cikoria |
| **Rollout** | Full team |

---

## Priority Assignment Rules

| Priority | Value | Criteria |
|----------|-------|----------|
| **Urgent** | 1 | Production down, blocking customers, security issue, explicit "urgent/ASAP" |
| **High** | 2 | Affects multiple users, significant impact, needs attention soon |
| **Normal** | 3 | Standard work, default for most tickets |
| **Low** | 4 | Nice to have, no immediate impact, can wait |

### Priority Keywords Detection
- **Urgent (1):** "urgent", "ASAP", "critical", "production down", "blocking", "security"
- **High (2):** "important", "affecting customers", "please fix", "broken"
- **Low (4):** "when you have time", "nice to have", "low priority"

---

## Phase 2: Enhanced Refinement Rules

### 2.1 Email Source Categorization
Detect sender patterns to route appropriately:

```typescript
const SENDER_RULES = {
  // Support team emails -> likely Bug or Task
  'support@': { defaultType: 'Bug', priority: 2 },
  'ops@': { defaultType: 'Bug', priority: 1 },
  
  // Customer emails -> likely Feature or Improvement
  'customer': { defaultType: 'Feature', priority: 3 },
  
  // Internal team -> Task
  '@weapply.se': { defaultType: 'Task', priority: 3 },
};
```

### 2.2 Subject Line Patterns
```typescript
const SUBJECT_PATTERNS = [
  { pattern: /error|bug|broken|not working/i, type: 'Bug', priority: 2 },
  { pattern: /feature request|can we add|would be nice/i, type: 'Feature', priority: 3 },
  { pattern: /urgent|asap|critical/i, priority: 1 },
  { pattern: /question|how do|help/i, type: 'Task', priority: 3 },
];
```

### 2.3 Team Routing Rules
Route to correct team based on content:

```typescript
const TEAM_ROUTING = {
  'Enspecta': ['enspecta', 'inspector', 'certification'],
  'ASPACE': ['aspace', 'parking', 'space'],
  'Client': ['client', 'customer portal'],
  'Infra / DevOps': ['server', 'deployment', 'AWS', 'kubernetes'],
};
```

---

## Phase 3: Advanced Features (Future)

### 3.1 Duplicate Detection
- Check for similar titles in recent tickets
- Link as duplicate if confidence > 80%
- Add comment with reference

### 3.2 Auto-Assignment
Based on area labels:
- Frontend → Frontend developers
- Backend → Backend developers
- Database → DBA team
- Devops → DevOps team

### 3.3 SLA Tracking
Add due dates based on priority:
- Urgent: 4 hours
- High: 1 day
- Normal: 1 week
- Low: No due date

### 3.4 Response Templates
Auto-generate acknowledgment comments:
- "Thank you for reporting this issue. We're looking into it."
- "Your feature request has been logged. We'll review it in our next planning session."

---

## Configuration File Structure (Proposed)

```typescript
// src/refinementConfig.ts
export const refinementConfig = {
  // Label mappings
  labels: {
    type: ['Bug', 'Feature', 'Improvement', 'Task', 'Research', 'Epic', 'Change request'],
    area: ['Frontend', 'Backend', 'Database', 'Admin', 'API', 'Devops', 'UX/UI'],
    owner: ['Software', 'Production', 'Hardware', 'Embedded', 'Rollout'],
  },
  
  // Priority rules
  priority: {
    keywords: {
      urgent: ['urgent', 'asap', 'critical', 'production down'],
      high: ['important', 'broken', 'blocking'],
      low: ['when possible', 'nice to have'],
    },
    defaults: {
      Bug: 2,
      Feature: 3,
      Task: 3,
    },
  },
  
  // Routing rules
  routing: {
    byDomain: {
      'support@': { type: 'Bug', priority: 2 },
    },
    bySubject: [
      { pattern: /error|bug/i, type: 'Bug' },
    ],
  },
};
```

---

## Implementation Roadmap

### ✅ Phase 1 (Complete)
- [x] Webhook endpoint working
- [x] AI refinement with GPT-4o-mini
- [x] Label application (Type, Area, Owner)
- [x] Priority assignment
- [x] Structured description format

### 🔄 Phase 2 (Next)
- [ ] Extract refinement config to separate file
- [ ] Add sender-based routing rules
- [ ] Improve subject line pattern matching
- [ ] Add status helpers labels (Ready for QA, Needs review)

### 📋 Phase 3 (Future)
- [ ] Duplicate detection
- [ ] Auto-assignment based on area
- [ ] SLA/due date assignment
- [ ] Response templates
- [ ] Multi-team routing

---

## Testing Checklist

When making changes to refinement rules:

1. **Create test ticket** with email-like content
2. **Verify webhook** receives it (check logs)
3. **Check labels** are correctly assigned
4. **Check priority** matches content urgency
5. **Verify description** is well-structured
6. **Confirm no duplicates** are processed

```bash
# View live logs
sudo journalctl -u weapply-pm -f

# Restart after changes
npm run build && sudo systemctl restart weapply-pm
```
