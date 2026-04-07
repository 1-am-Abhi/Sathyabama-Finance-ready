# Sathyabama Research & Finance Management Portal

A production-grade university finance management system built with React, TailwindCSS, and shadcn/ui.

## 🎯 Overview

This is a comprehensive research and finance management portal for Sathyabama Institute of Science and Technology. The system enforces strict role-based access control and maintains complete audit trails for all financial transactions.

## 👥 User Roles

### 1. Admin (Dean / Research Head)
- Create and approve research projects
- Assign faculty to projects
- Approve fund requests
- View all reports (finance flow is read-only)

### 2. Faculty
- View assigned projects
- Request funds
- Track fund and PFMS status
- Upload utilization documents

### 3. Finance Officer
- Update fund flow stages (sequential only)
- Manage PFMS data
- Verify internship fee payments
- View financial reports

## 💰 Fund Flow System

The system enforces a strict 6-stage sequential fund flow:

1. **Fund Approved** - Admin approves fund request
2. **Fund Released** - Finance Officer releases funds
3. **Cheque Released** - Finance Officer issues cheque
4. **Amount Disbursed** - Finance Officer disburses amount
5. **Utilization Completed** - Faculty submits utilization certificate
6. **Settlement Closed** - Finance Officer closes settlement

**Rules:**
- No skipping stages
- No backward movement
- Each transition records timestamp and Finance Officer name
- Only Finance Officers can update stages

## 🏦 PFMS Integration

The system manages Public Financial Management System (PFMS) data:
- PFMS Project ID
- Government organization
- Sanction order details
- Installment tracking
- UTR/Transaction ID
- Utilization certificate status

## 🎓 Internship Fee Verification

Finance Officers verify internship fee payments. Internships are **blocked from approval** until fees are marked as "Paid" with:
- Payment mode
- Receipt number
- Payment date

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ and npm

### Installation

```bash
# Navigate to project directory
cd finance-frontend

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Demo Login

Select a role and use any email/password to login:
- **Admin**: Full project and approval management
- **Faculty**: Project and fund request management
- **Finance Officer**: Financial operations only

## 📁 Project Structure

```
src/
├── api/                    # API integration layer
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── auth/              # Authentication components
│   └── shared/            # Shared custom components
├── pages/
│   ├── admin/             # Admin module pages
│   ├── faculty/           # Faculty module pages
│   └── finance/           # Finance Officer pages
├── contexts/              # React contexts (Auth)
├── constants/             # Role and fund flow constants
├── lib/                   # Utility functions
└── routes/                # Route configuration
```

## 🛠️ Tech Stack

- **React** - UI framework
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Routing
- **React Query** - Data fetching
- **Axios** - HTTP client

## 🔒 Security Features

- JWT-based authentication
- Role-based route protection
- Automatic token refresh
- Audit trail for all financial actions
- Sequential fund flow enforcement

## 📊 Key Features

✅ Role-based dashboards
✅ Sequential fund flow with audit trail
✅ PFMS data management
✅ Internship fee verification with blocking
✅ Document upload and tracking
✅ Comprehensive reporting
✅ Professional university UI

## 🎨 UI/UX

- Clean, professional university design
- Responsive layout
- Disabled buttons for unauthorized actions (not hidden)
- Clear status indicators
- Audit-friendly information display

## 📝 Notes

- This is a **frontend-only** implementation
- Mock authentication is used for demo purposes
- In production, connect to actual backend API
- Update `REACT_APP_API_URL` in `.env` for API endpoint

## 🔄 Future Enhancements

- Connect to backend API
- Real-time notifications
- Advanced reporting and analytics
- Document preview
- Email notifications
- Mobile app support

## 📄 License

Proprietary - Sathyabama Institute of Science and Technology

---

**Built for audit compliance and production deployment**
