# Weapply PM - AI Email Refinement System

## Project Info
- **Linear Project**: [WeApply - AI Refinement](https://linear.app/weapply/project/weapply-ai-refinement-a98378fa1479)
- **Team**: WeTest
- **Owner**: Pelle Nyman (pelle@weapply.se)

---

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Email arrives at pm@weapply.se                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
              ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│  Internal Sender        │             │  External Sender        │
│  (@weapply.se)          │             │  (client domain)        │
│                         │             │                         │
│  → Assign to sender     │             │  → Create/find client   │
│  → Label: Internal      │             │    project by domain    │
│                         │             │  → Label: External      │
└───────────┬─────────────┘             └───────────┬─────────────┘
            │                                       │
            │         ┌─────────────────┐           │
            └────────►│  Is Forwarded?  │◄──────────┘
                      └────────┬────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│  Forwarded Email        │       │  Direct Email           │
│                         │       │                         │
│  → Extract original     │       │  → Sender is requester  │
│    sender from body     │       │  → Check for spam/lead  │
│  → Forwarder = owner    │       │                         │
│  → Label: Forwarded     │       │  → Label: External      │
│    or Internal Forward  │       │    Direct               │
└───────────┬─────────────┘       └───────────┬─────────────┘
            │                                 │
            └─────────────┬───────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Refinement (OpenAI GPT-4o-mini)                             │
│                                                                 │
│  → Clean title (remove Fwd:/Re:, make actionable)               │
│  → Analyze urgency (keywords, tone, impact)                     │
│  → Extract action items                                         │
│  → Assign labels (Type, Dept, Client, Tech, Phase, Billing)     │
│  → Set priority (Urgent/High/Normal/Low)                        │
│  → Analyze attachments (if any)                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Update Linear Ticket                                           │
│                                                                 │
│  → Title, description, labels, priority                         │
│  → Assign to appropriate person                                 │
│  → Add to client project                                        │
│  → Create sub-issues for attachments                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Roadmap

### ✅ Phase 1 - Complete
- [x] Webhook endpoint at `/webhook/linear-webhook`
- [x] AI refinement with GPT-4o-mini
- [x] Label structure for development agency
- [x] Priority assignment
- [x] Structured description format

### 🔄 Phase 2 - In Progress

| Issue | Feature | Status |
|-------|---------|--------|
| [WET-17](https://linear.app/weapply/issue/WET-17) | Auto-assign tickets from internal senders | Backlog |
| [WET-18](https://linear.app/weapply/issue/WET-18) | Client project auto-creation by domain | Backlog |
| [WET-21](https://linear.app/weapply/issue/WET-21) | Internal forward detection and labeling | Backlog |
| [WET-22](https://linear.app/weapply/issue/WET-22) | External direct email routing | Backlog |

### 📋 Phase 3 - Planned

| Issue | Feature | Status |
|-------|---------|--------|
| [WET-19](https://linear.app/weapply/issue/WET-19) | Enhanced urgency detection | Backlog |
| [WET-20](https://linear.app/weapply/issue/WET-20) | Attachment capture and analysis | Backlog |
| [WET-23](https://linear.app/weapply/issue/WET-23) | Manual ticket refinement via project | Backlog |
| [WET-24](https://linear.app/weapply/issue/WET-24) | Improve AI prompt | Backlog |

---

## Label Structure

### 🏷️ TYPE (Required)
`Bug` | `Feature` | `Improvement` | `Task` | `Support` | `Meeting` | `Documentation` | `Maintenance` | `Hotfix` | `Refactor`

### 🏢 DEPARTMENT
`Development` | `Design` | `Project Mgmt` | `Accounting` | `Sales` | `Operations`

### 👤 CLIENT STATUS
`New Lead` | `Active Client` | `Prospect` | `Former Client` | `Internal`

### 💻 TECH STACK
`Frontend` | `Backend` | `Mobile` | `Database` | `Infrastructure` | `Integration` | `Security` | `AI/ML`

### 📅 PROJECT PHASE
`Discovery` | `Planning` | `In Development` | `Review` | `Testing` | `Deployment` | `Post-Launch`

### 💰 BILLING
`Quote` | `Invoice` | `Payment` | `Contract` | `Overdue`

### 📨 REQUEST SOURCE
`Email` | `Internal Forward` | `External Direct` | `Forwarded` | `Meeting Notes` | `Chat` | `Phone` | `Portal`

---

## Priority Rules

| Priority | Value | Triggers |
|----------|-------|----------|
| **Urgent** | 1 | "urgent", "ASAP", "critical", production down, security, overdue payment, ALL CAPS panic |
| **High** | 2 | Customer impact, deadline, important client, "please help", sales opportunity |
| **Normal** | 3 | Standard requests (default) |
| **Low** | 4 | "when you can", "nice to have", "future consideration" |

---

## Email Routing Logic

### Internal Sender (@weapply.se)
```
IF sender.domain === 'weapply.se':
  - Assign ticket to sender (match by email)
  - Add label: "Internal"
  - IF forwarded:
    - Add label: "Internal Forward"
    - Extract original sender from email body
    - Create/assign client project for original sender domain
```

### External Sender
```
IF sender.domain !== 'weapply.se':
  - Create project "Client: {domain}" if not exists
  - Add ticket to client project
  - IF direct to pm@weapply.se:
    - Add label: "External Direct"
    - Consider: New Lead vs spam detection
  - IF forwarded by internal:
    - Forwarder = ticket owner
    - Add label: "Forwarded"
```

---

## Configuration

### Environment Variables
```bash
PORT=3002
OPENAI_API_KEY=sk-...
LINEAR_API_KEY=lin_api_...
LINEAR_WEBHOOK_SECRET=...
DEFAULT_LINEAR_TEAM=WeTest
ENABLE_AI_REFINEMENT=true
```

### Testing
```bash
# View logs
sudo journalctl -u weapply-pm -f

# Restart service
npm run build && sudo systemctl restart weapply-pm

# Service status
sudo systemctl status weapply-pm
```

---

## Cursor Integration

This project uses Cursor rules to ensure:
1. All feature discussions create Linear issues
2. Work is tracked in "WeApply - AI Refinement" project
3. Code follows project conventions
4. Documentation stays updated

See `.cursorrules` and `.cursor/rules/` for details.
