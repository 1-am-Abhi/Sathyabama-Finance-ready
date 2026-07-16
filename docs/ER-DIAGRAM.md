# Entity–Relationship Diagram

> Rendered with Mermaid. Associations are defined centrally in
> `finance-backend/src/models/index.js`. Note the schema uses a dual `id`/`_id`
> key convention (see PRODUCTION-READINESS.md); most User relationships join on the
> UUID `_id` with `constraints: false`, so they are not all backed by DB-level FKs.

```mermaid
erDiagram
    Organization ||--o{ User : "has (string tag)"
    Organization ||--o{ Project : "has"
    ResearchCenter ||--o{ User : "faculty"
    ResearchCenter ||--o{ Project : "hosts"
    ResearchCenter ||--o{ FundRequest : "scopes"

    User ||--o{ Project : "owns (facultyId/userId)"
    User ||--o{ FundRequest : "requests (userId/facultyId)"
    User ||--o{ Disbursement : "disbursedBy"
    User ||--o{ EventRequest : "creates"
    User ||--o{ ODRequest : "applies"
    User ||--o{ EquipmentRequest : "requests"
    User ||--o{ Document : "uploads"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "acts"
    User ||--o{ Revenue : "records"
    User }o--o{ Project : "ProjectMember (PI/MEMBER)"

    Project ||--o{ FundRequest : "has installments"
    Project ||--o{ Disbursement : "receives"
    Project ||--o{ ProjectMember : "team"
    Project ||--o{ PFMSTransaction : "pfms"
    Project ||--o{ EventRequest : "events"
    Project ||--o{ Ledger : "ledger lines"

    FundRequest ||--o{ Disbursement : "payouts"
    FundRequest ||--o{ Ledger : "ledger lines"

    Disbursement ||--o{ Ledger : "ledger lines"

    JournalEntry ||--o{ Ledger : "journal lines"
    Account ||--o{ Ledger : "account lines"
    AccountingPeriod ||..o{ Ledger : "period lock (by date)"
    Revenue ||--o{ Ledger : "revenue lines"

    User {
      int id PK "autoincrement"
      uuid _id UK "real join key"
      string email UK
      enum role "ADMIN|FACULTY|FINANCE_OFFICER|AUDITOR"
      string organizationId
      uuid researchCenterId
      enum status
    }
    Project {
      uuid id PK
      string title
      string pi
      float sanctionedBudget
      string status "PENDING|ACTIVE|FROZEN..."
      uuid facultyId
      string organizationId
    }
    FundRequest {
      uuid id PK
      string projectTitle
      uuid projectId FK
      float requestedAmount
      int installmentNumber
      string type "INSTALLMENT"
      string status
      enum currentStage "FUND_APPROVED..SETTLEMENT_CLOSED"
      enum chequeStatus
      enum source "PFMS|INSTITUTIONAL|OTHERS"
      json documents "proofs: bills/invoices/UC"
    }
    Disbursement {
      uuid id PK
      uuid fundRequestId FK
      uuid projectId FK
      decimal amount
      int installmentNumber
      string paymentMode
      string referenceId UK
      string idempotencyKey UK
      string status "COMPLETED|REVERSED"
      string organizationId
    }
    Ledger {
      uuid id PK
      uuid journalId FK
      uuid accountId FK
      uuid projectId
      uuid fundRequestId
      uuid disbursementId
      decimal debit
      decimal credit
      string hash "SHA-256 chain"
      string previousHash
      jsonb metadata
    }
    JournalEntry {
      uuid id PK
      string description
      string referenceId
      date transactionDate
    }
    Account {
      uuid id PK
      string name UK
      string code UK
      enum type "ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE"
    }
    AccountingPeriod {
      uuid id PK
      date startDate
      date endDate
      enum status "OPEN|CLOSED"
    }
    EventRequest {
      uuid _id PK
      uuid facultyId
      string status
      string fundingType
    }
    ODRequest {
      uuid _id PK
      uuid facultyId
      string odType
      string status
      string proofStatus
    }
    Notification {
      uuid _id PK
      uuid userId
      string title
      string type
      bool isRead
    }
    AuditLog {
      uuid id PK
      uuid userId
      string action
      string entityType
      string entityId
      string hash
    }
```

## Key relationships in words

- A **Project** has many **FundRequests** (one per installment) and many
  **Disbursements**. Each **FundRequest** has many **Disbursements** (partial
  payouts), keyed by `(fundRequestId, installmentNumber)`.
- Every disbursement posts a balanced **JournalEntry** with two or more **Ledger**
  lines referencing **Accounts** (Expense debit / Bank credit).
- The **Ledger** is append-only and hash-chained; **AccountingPeriod** enforces
  period locks by transaction date.
- **Users** relate to almost everything by the UUID `_id` join key.
- **Organization** is a string tenant tag (`ORG_1`), not a hard FK.
