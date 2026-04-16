# Sathyabama Research Finance Portal

A production-grade, full-stack financial workflow engine built to streamline the funding lifecycle between faculty researchers, administrative staff, and finance officers.

This application eliminates paper-heavy tracking by introducing a scalable digital pipeline for real-time fund requests, automated disbursement tracking, granular audit trails, and data-driven observability across organizational tiers.

---

## 🎯 Problem Statement

Research universities often process hundreds of fund requests manually via emails and paperwork. This leads to fragmented communication (status opacity), delays in fund disbursement, disjointed budget allocation awareness, and cumbersome record tracking. We needed an organized, secure, and observable solution specifically curated to track installment-based fund logic efficiently.

---

## 🚀 Features

- **Multi-Role Dashboards (Role-Based Access Control):** Dedicated interfaces for Faculty, Admins, and Finance Officers with distinct authority constraints.
- **Installment-Driven Fund Flows:** Faculty can submit iterative fund requests tied to a project's allocated budget ceiling.
- **Real-Time Notification Engine:** Integrated polling notification bell for all roles keeping users strictly informed on request stage advancements.
- **Enterprise Audit Logging:** Auto-recorded structural metadata reflecting every fund approval, rejection, and disbursal operation.
- **Resilient Cloud Media:** Document attachments and invoices securely uploaded directly to Cloudinary.
- **Automated Pagination:** Scale seamlessly with offset limit queries for handling thousands of requests historically.
- **Dynamic Observability Pipeline:** Fully incorporated request tracing IDs alongside Morgan & Winston structured JSON logging.
- **Graceful Error Handling:** Implemented global React Error Boundaries preventing catastrophic cascading failures on dynamic render bounds.

---

## 🛠️ Tech Stack

**Frontend**
- React 19 (Hooks, Contexts)
- Tailwind CSS (Utility-First Styling, PostCSS)
- React Router (DOM routing matrix)
- React Query (Automated data cache and retry resilience)
- Sonner & Lucide React (Micro-interactions and visually crisp iconography)
- Context API (State propagation)
- Axios (Intercepted async API networking)

**Backend**
- Node.js (22.x Runtime) & Express.js (5.x Router)
- PostgreSQL & Sequelize ORM (Relational strictness, automatic migration tracking)
- Winston & Morgan (Production logging matrix)
- Cloudinary & Multer (Storage-agnostic file uplinks)
- JSON Web Tokens (Bcrypt encrypted Auth logic)

---

## 🏗️ Architecture Overview

The system strictly decouples State from Navigation.
Requests traverse through standardized Express Middlewares checking JWT integrity, decoding roles, and injecting request-IDs for tracing before hitting controller logic. 
In the Database logic layer, Sequelize utilizes explicit transactional blocks to execute complex operations (like modifying a FundRequest status, generating a Disbursement ledger mark, adjusting the Project's overall fund pool, and lodging an Audit metric in the same breath) preventing any orphaned operations entirely. 

The React Frontend aggregates logic globally using a cluster of Context APIs layered within robust Error Boundaries, leaning extensively on Tanstack Query for persistent client-side data validity.

---

## 💻 Live Demo & Screenshots

> Currently deployed iteratively on Render servers using CI/CD. 
*(Screenshots to be attached post-staging testing phase)*

---

## ⚙️ Setup Instructions

**Prerequisites:** You must have Node `>= 22.x` and a functioning instance of PostgreSQL installed on your machine.

**1. Clone the repository**
```bash
git clone https://github.com/1-am-Abhi/Sathyabama-Finance-ready.git
```

**2. Setup the Backend Database**
```bash
cd finance-backend
npm install
# configure your .env based on .env.example
npx sequelize-cli db:migrate # run base schema configuration
npm run dev
```

**3. Setup the React Frontend**
```bash
cd finance-frontend
npm install
# configure your .env
npm run dev
```

**4. Default Base Admin Credentials**
System initialization automatically seeds required roots:
- Email: admin@sathyabama.ac.in
- Check `seedUser.js` script for cryptographic details.

---

*Architected by the internal Research App dev unit for deployment scalability.*
