# Weapply PM - Refinement Rules & Categorization

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
│     → Assign labels (Type, Dept, Client, Tech, Phase, Billing)  │
│     → Set priority (1-4 based on urgency)                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Update Linear ticket via API                                │
│     → Title, description, labels, priority                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Label Structure for Development Agency

### 🏷️ TYPE (Required - pick ONE)
| Label | When to use | Color |
|-------|-------------|-------|
| **Bug** | Something is broken, errors | 🔴 Red |
| **Feature** | New functionality request | 🟣 Purple |
| **Improvement** | Enhancement to existing feature | 🔵 Blue |
| **Task** | General work item | 🟢 Green |
| **Support** | Support request or question | 🔵 Cyan |
| **Meeting** | Meeting notes or follow-up | 🟠 Orange |
| **Documentation** | Documentation updates | 🟢 Green |
| **Maintenance** | Regular maintenance work | ⚪ Gray |
| **Hotfix** | Urgent production fix | 🔴 Red |
| **Refactor** | Code refactoring | 🔵 Indigo |

### 🏢 DEPARTMENT (pick ONE if clear)
| Label | When to use |
|-------|-------------|
| **Development** | Dev team work |
| **Design** | Design/UX team |
| **Project Mgmt** | PM work |
| **Accounting** | Finance/accounting |
| **Sales** | Sales/business development |
| **Operations** | DevOps/infrastructure |

### 👤 CLIENT STATUS (pick ONE if applicable)
| Label | Description |
|-------|-------------|
| **New Lead** | Potential new client |
| **Active Client** | Current paying client |
| **Prospect** | In sales pipeline |
| **Former Client** | Past client relationship |
| **Internal** | Internal company work |

### 💻 TECH STACK (pick ONE if technical)
| Label | Description |
|-------|-------------|
| **Frontend** | UI, React, browser-related |
| **Backend** | API, server, business logic |
| **Mobile** | iOS, Android, React Native |
| **Database** | PostgreSQL, data issues |
| **Infrastructure** | AWS, servers, deployment |
| **Integration** | Third-party integrations |
| **Security** | Security-related |
| **AI/ML** | AI/ML features |

### 📅 PROJECT PHASE (pick ONE if applicable)
| Label | Description |
|-------|-------------|
| **Discovery** | Initial requirements gathering |
| **Planning** | Project planning and scoping |
| **In Development** | Active development phase |
| **Review** | Code review or client review |
| **Testing** | QA and testing phase |
| **Deployment** | Deployment and launch |
| **Post-Launch** | Maintenance and support |

### 💰 BILLING (pick if finance-related)
| Label | Description |
|-------|-------------|
| **Quote** | Quote or estimate needed |
| **Invoice** | Invoice related |
| **Payment** | Payment tracking |
| **Contract** | Contract or agreement |
| **Overdue** | Overdue payment |

### 📨 REQUEST SOURCE (auto-applied)
| Label | Description |
|-------|-------------|
| **Email** | From email (auto for pm@weapply.se) |
| **Meeting Notes** | From meeting |
| **Chat** | From Slack/Teams |
| **Phone** | From phone call |
| **Portal** | From client portal |

---

## Priority Assignment Rules

| Priority | Value | Criteria |
|----------|-------|----------|
| **Urgent** | 1 | Production down, blocking, security, overdue payment, "urgent/ASAP" |
| **High** | 2 | Affects customers, important request, quote/sales opportunity |
| **Normal** | 3 | Standard work, default for most tickets |
| **Low** | 4 | Nice to have, no immediate impact |

---

## Example Refinements

### Sales Lead (Quote Request)
```
Input:  "Fwd: Quote request for new mobile app"
Output: "Quote Request for New Mobile App Development"
Labels: Development, Prospect, Email
Priority: High (2)
```

### Finance (Overdue Payment)
```
Input:  "Re: Invoice #2024-0892 payment overdue"  
Output: "Process Payment for Overdue Invoice #2024-0892"
Labels: Accounting, Active Client, Overdue, Email
Priority: Urgent (1)
```

### Bug Report
```
Input:  "Fwd: API returning 500 errors"
Output: "Fix 500 Errors on /users Endpoint"
Labels: Bug, Development, Active Client, Backend, Email
Priority: Urgent (1)
```

### Feature Request
```
Input:  "Re: Feature request - dark mode"
Output: "Implement Dark Mode Support in Admin Panel"
Labels: Feature, Development, Frontend, Email
Priority: High (2)
```

---

## Testing

```bash
# View live logs
sudo journalctl -u weapply-pm -f

# Restart after changes
npm run build && sudo systemctl restart weapply-pm

# Service status
sudo systemctl status weapply-pm
```

---

## Future Enhancements

### Phase 2
- [ ] Auto-assignment based on department label
- [ ] Duplicate detection for similar titles
- [ ] SLA tracking with due dates

### Phase 3
- [ ] Multi-team routing
- [ ] Response templates
- [ ] Client portal integration
