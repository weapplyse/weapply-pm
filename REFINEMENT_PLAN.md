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
| [WET-18](https://linear.app/weapply/issue/WET-18) | Client project auto-creation by domain | ✅ Done |
| [WET-21](https://linear.app/weapply/issue/WET-21) | Internal forward detection and labeling | ✅ Done |
| [WET-22](https://linear.app/weapply/issue/WET-22) | External direct email routing | ✅ Done |

### ✅ Phase 3 - Advanced Features (Complete)

| Issue | Feature | Status |
|-------|---------|--------|
| [WET-19](https://linear.app/weapply/issue/WET-19) | Enhanced urgency detection | ✅ Done |
| [WET-20](https://linear.app/weapply/issue/WET-20) | Attachment capture and analysis | ✅ Done |
| [WET-23](https://linear.app/weapply/issue/WET-23) | Manual ticket refinement via project | ✅ Done |
| [WET-24](https://linear.app/weapply/issue/WET-24) | Improved AI prompt | ✅ Done |

### 🔮 Future Enhancements

| Feature | Description |
|---------|-------------|
| Spam detection | Filter obvious spam/marketing emails |
| Duplicate detection | Link related tickets from same sender |
| Thread tracking | Group email conversations together |
| AI image analysis | Use GPT-4V for screenshot analysis |
| Slack notifications | Notify on urgent tickets |

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

## Manual Refinement

### Refine Queue Project
For manually created tickets or content that needs AI refinement:

1. Create a new ticket in Linear with your content
2. Add the ticket to the **Refine Queue** project
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
2. Work is tracked in "WeApply - AI Refinement" project
3. Code follows project conventions
4. Documentation stays updated

See `.cursorrules` and `.cursor/rules/` for details.
