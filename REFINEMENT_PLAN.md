# Weapply PM - AI Email Refinement System

## Project Info
- **Linear Project**: [🤖 Linear Automation](https://linear.app/weapply/project/linear-automation-a98378fa1479)
- **Team**: WeTest
- **Owner**: Pelle Nyman (pelle@weapply.se)

---

## Project Structure

| Project | Purpose | Auto-Processed |
|---------|---------|----------------|
| 📥 Mail Inbox | Refined emails from pm@weapply.se | ✅ Full AI |
| 💬 Slack Intake | Tickets from Slack channel | Light cleanup |
| 🪄 Refine Queue | Manual refinement trigger | ✅ Full AI |
| 🤖 Linear Automation | Feature development & tracking | ❌ Never |
| 📝 General | Manual entries | ❌ Never |
| 📊 Project Management | Internal PM only | ❌ Never |
| 🏢 Clients | Known client tickets | ✅ Routing |
| 🌐 External | Unknown external senders | ✅ Routing |

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
│  → Route: Mail Inbox    │             │    LABEL (not project)  │
│                         │             │  → Route by client type │
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
│  → Extract original     │       │  Known client domain:   │
│    sender from body     │       │    → Label: Client:x    │
│  → Forwarder = owner    │       │    → Project: Clients   │
│  → Client label added   │       │                         │
│  → Route: Clients       │       │  Unknown domain:        │
│    or External          │       │    → Label: Unknown     │
└───────────┬─────────────┘       │    → Project: External  │
            │                     └───────────┬─────────────┘
            └─────────────┬───────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Refinement (OpenAI GPT-4o-mini)                             │
│                                                                 │
│  → Clean title (remove Fwd:/Re:, make actionable)               │
│  → Analyze urgency (keywords, tone, impact)                     │
│  → Extract action items                                         │
│  → Assign labels (Type, Dept, Tech, Phase, Billing, Source)     │
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
│  → Add to target PROJECT (Mail/Clients/External)                │
│  → Create sub-issues for attachments                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Roadmap

### ✅ Phase 1 - Core System (Complete)
- [x] Webhook endpoint at `/webhook/linear-webhook`
- [x] AI refinement with GPT-4o-mini
- [x] Label structure for development agency
- [x] Priority assignment
- [x] Structured description format

### ✅ Phase 2 - Email Routing (Complete)

| Issue | Feature | Status |
|-------|---------|--------|
| [WET-17](https://linear.app/weapply/issue/WET-17) | Auto-assign tickets from internal senders | ✅ Done |
| [WET-18](https://linear.app/weapply/issue/WET-18) | Client project auto-creation by domain | ✅ Done → Replaced by labels |
| [WET-21](https://linear.app/weapply/issue/WET-21) | Internal forward detection and labeling | ✅ Done |
| [WET-22](https://linear.app/weapply/issue/WET-22) | External direct email routing | ✅ Done |

### ✅ Phase 3 - Advanced Features (Complete)

| Issue | Feature | Status |
|-------|---------|--------|
| [WET-19](https://linear.app/weapply/issue/WET-19) | Enhanced urgency detection | ✅ Done |
| [WET-20](https://linear.app/weapply/issue/WET-20) | Attachment capture and analysis | ✅ Done |
| [WET-23](https://linear.app/weapply/issue/WET-23) | Manual ticket refinement via project | ✅ Done |
| [WET-24](https://linear.app/weapply/issue/WET-24) | Improved AI prompt | ✅ Done |

### ✅ Phase 4 - Project Restructure (Complete)

| Issue | Feature | Status |
|-------|---------|--------|
| [WET-37](https://linear.app/weapply/issue/WET-37) | Update routing logic for new project structure | ✅ Done |
| [WET-38](https://linear.app/weapply/issue/WET-38) | Implement client labels instead of projects | ✅ Done |
| [WET-40](https://linear.app/weapply/issue/WET-40) | Cleanup old client projects | ✅ Done |
| [WET-41](https://linear.app/weapply/issue/WET-41) | Update System Overview document | ✅ Done |

### 🔮 Future Enhancements (Backlog)

| Issue | Feature | Description |
|-------|---------|-------------|
| [WET-30](https://linear.app/weapply/issue/WET-30) | Spam detection | Filter obvious spam/marketing emails |
| [WET-31](https://linear.app/weapply/issue/WET-31) | Duplicate detection | Link related tickets from same sender |
| [WET-32](https://linear.app/weapply/issue/WET-32) | Thread tracking | Group email conversations together |
| [WET-33](https://linear.app/weapply/issue/WET-33) | AI image analysis | Use GPT-4V for screenshot analysis |
| [WET-34](https://linear.app/weapply/issue/WET-34) | Slack notifications | Notify on urgent tickets |
| [WET-35](https://linear.app/weapply/issue/WET-35) | Email auto-reply | Send ticket confirmation |
| [WET-36](https://linear.app/weapply/issue/WET-36) | Analytics dashboard | Ticket metrics and reporting |
| [WET-39](https://linear.app/weapply/issue/WET-39) | Slack channel intake | Create tickets from Slack messages |

---

## Label Structure

### 🏷️ TYPE (Required)
`Bug` | `Feature` | `Improvement` | `Task` | `Support` | `Meeting` | `Documentation` | `Maintenance` | `Hotfix` | `Refactor`

### 🏢 DEPARTMENT
`Development` | `Design` | `Project Mgmt` | `Accounting` | `Sales` | `Operations`

### 👤 CLIENT
Auto-created: `Client: domain.com` for each unique sender domain
Manual: `Unknown Sender` for personal email domains (gmail, yahoo, etc.)

### 💻 TECH STACK
`Frontend` | `Backend` | `Mobile` | `Database` | `Infrastructure` | `Integration` | `Security` | `AI/ML`

### 📅 PROJECT PHASE
`Discovery` | `Planning` | `In Development` | `Review` | `Testing` | `Deployment` | `Post-Launch`

### 💰 BILLING
`Quote` | `Invoice` | `Payment` | `Contract` | `Overdue`

### 📨 REQUEST SOURCE
`Email` | `Internal Forward` | `External Direct` | `Forwarded` | `Meeting Notes` | `Chat` | `Phone` | `Portal`

### 🤖 AUTOMATION
`Feature Request` - For Linear Automation project ideas

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
  - Add label: "Email" or "Internal Forward"
  - Route to: 📥 Mail Inbox
  - IF forwarded:
    - Extract original sender from email body
    - Create client label for original sender domain
    - Route to: 🏢 Clients (if known) or 🌐 External
```

### External Sender
```
IF sender.domain !== 'weapply.se':
  - Check if business domain (not gmail/yahoo/etc)
  - IF business domain:
    - Create/find label "Client: {domain}"
    - Route to: 🏢 Clients
  - ELSE (personal email):
    - Add label: "Unknown Sender"
    - Route to: 🌐 External
```

### Project Routing Matrix

| Sender Type | Is Forwarded | Has Client Label | Target Project |
|-------------|--------------|------------------|----------------|
| Internal | No | - | 📥 Mail Inbox |
| Internal | Yes | Yes | 🏢 Clients |
| Internal | Yes | No | 🌐 External |
| External | No | Yes | 🏢 Clients |
| External | No | No | 🌐 External |
| External | Yes | Yes | 🏢 Clients |
| External | Yes | No | 🌐 External |

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

### Project IDs
```typescript
PROJECT_IDS = {
  MAIL_INBOX: '1f70f9a4-c945-402f-a0a5-77f0f207f1ea',
  SLACK_INTAKE: '76d888f2-2482-4c29-bebd-c5dc3a6436d9',
  REFINE_QUEUE: '5ddfdf70-180b-472b-83a5-5a3ecbe70384',
  LINEAR_AUTOMATION: '5d992f68-4c78-4294-91d9-294808bf1d49',
  GENERAL: '8b02c3f0-a9db-49b5-8026-a2f5cacda2f5',
  PROJECT_MANAGEMENT: '335e96f1-490d-41a8-8676-248329f37e4c',
  CLIENTS: '5186127d-5e90-4d63-8b20-bc522c2e4a5d',
  EXTERNAL: '977387e2-8409-4a2d-9661-9fe98bbd0870',
}
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

## Manual Refinement

### Refine Queue Project
For manually created tickets or content that needs AI refinement:

1. Create a new ticket in Linear with your content
2. Add the ticket to the **🪄 Refine Queue** project
3. The webhook will automatically:
   - Process the content with AI
   - Create an actionable title
   - Add appropriate labels and priority
   - Create a sub-issue with original content for reference
   - Remove the ticket from Refine Queue

### Use Cases
- Meeting notes that need structuring
- Chat conversations to convert to tickets
- Documents to analyze and create action items
- Manual entries that need categorization

---

## Attachment Handling

The system detects and analyzes attachments in emails:

### Supported File Types
| Category | Extensions | Action |
|----------|------------|--------|
| Documents | doc, docx, txt, md | Review required |
| Spreadsheets | xls, xlsx, csv | Review data/timeline |
| PDFs | pdf | Process/review |
| Design | sketch, fig, psd, ai | Design review |
| Images | jpg, png, gif, svg | May need review if mockup |
| Presentations | ppt, pptx | Review presentation |

### Automatic Sub-Issues
For actionable attachments, the system creates sub-issues:
- **Title**: "Review contract: agreement.pdf"
- **Labels**: Task + relevant department
- **Description**: File details and parent reference

---

## Urgency Detection

The system analyzes content for urgency signals:

### Keyword Scoring
| Category | Keywords | Weight |
|----------|----------|--------|
| Critical | urgent, emergency, critical, asap | 30 |
| High | important, deadline, blocking, broken | 20 |
| Medium | please help, stuck, failing, error | 15 |
| Low | no rush, when you can, nice to have | -10 |

### Impact Analysis
- Customer/revenue impact
- Security concerns
- SLA/contract deadlines
- Production issues

### Priority Mapping
| Score | Priority |
|-------|----------|
| 60+ | Urgent (1) |
| 35-59 | High (2) |
| 15-34 | Normal (3) |
| <15 | Low (4) |

---

## Cursor Integration

This project uses Cursor rules to ensure:
1. All feature discussions create Linear issues
2. Work is tracked in "🤖 Linear Automation" project
3. Code follows project conventions
4. Documentation stays updated (this file + Linear System Overview)

See `.cursorrules` and `.cursor/rules/` for details.
