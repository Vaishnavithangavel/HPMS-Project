# Hopewell General Hospital - Patient Management System (HPMS)

Welcome to the **Hospital Patient Management System (HPMS)**, a production-ready outpatient clinical portal. This project is built using a modern, decoupled web architecture: **React.js (Vite)** on the frontend, **Node.js (Express)** on the backend, and **MySQL** as the relational database engine.

It features a bespoke, premium UI styled with custom **Vanilla CSS** (supporting light/dark theme switches, fluid glassmorphic modals, and responsive layout grids) and implements rigorous **role-based access control (RBAC)** across four key portal actors: Admin, Doctor, Receptionist, and Patient.

---

## Key Features

1. **Patient Self-Registration & Staff Intake**: Patients can register their accounts online. Staff (Admins and Receptionists) can also register patients directly and auto-generate their login credentials.
2. **Physician Directory & Specialty Search**: Patients can search and filter available medical practitioners by name and clinical specialty.
3. **Smart Appointment Scheduler**: Multi-user calendar. Implements **double-booking prevention** by blocking doctor scheduling slots within 30 minutes of another active appointment.
4. **Clinical Medical Records (EHR)**: Attending doctors can document diagnosis details, recovery treatment plans, and Rx prescriptions. Saving a diagnosis automatically marks the associated appointment as "Completed".
5. **Secure PDF Consultation Reports**: Patients and doctors can compile and download beautifully formatted consultation reports as PDF sheets directly via secure JWT streams.
6. **Unified Analytics Dashboard**: Role-customized statistics:
   - *Admins/Receptionists*: Aggregated stats, department loads (recharts), weekly trends, and recent security logs.
   - *Doctors*: Daily appointment list and totals.
   - *Patients*: Visit histories, upcoming visits, and latest prescriptions.
7. **Security & Auditing**: Password hashing via `bcryptjs`, session handling via secure `jsonwebtoken` (JWT), and system action logging in an `audit_logs` table.

---

## Folder Structure

```text
HPMS/
├── backend/
│   ├── src/
│   │   ├── config/       # Connection parameters
│   │   ├── controllers/  # Auth, Patients, Doctors, Appts, Records, Analytics
│   │   ├── db/           # schema.sql and seed/initializer scripts
│   │   ├── middleware/   # JWT verification & RBAC filters
│   │   ├── routes/       # Express route controllers
│   │   ├── utils/        # PDFKit engine & Activity Logger
│   │   └── server.js     # Entry point
│   ├── .env              # Configuration values
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, Navbar Layouts
│   │   ├── context/      # AuthContext & Toast provider
│   │   ├── pages/        # Login, Register, Dashboards, Records, Audits
│   │   ├── services/     # api.js fetch wrappers & PDF downloads
│   │   ├── App.jsx       # Routing & Shell guards
│   │   ├── index.css     # Dark mode, Glassmorphism, animations stylesheet
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── package.json          # Root scripts to handle workspaces concurrently
└── README.md
```

---

## Prerequisites

- **Node.js**: `v24` (or `v18+` recommended)
- **NPM**: `v10+`
- **MySQL Server**: Running on port `3306` (locally or remote)

---

## Setup & Running Instructions

### 1. Database Configuration
Rename or edit `/backend/.env` to match your running MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword  # Set your MySQL root password here
DB_NAME=hpms_db
DB_PORT=3306
JWT_SECRET=super_secret_key_for_hospital_patient_management_system_2026
JWT_EXPIRES_IN=24h
```

> [!NOTE]
> **Zero Manual SQL Setup**: The backend server runs an automatic initializer (`src/db/init-db.js`) on startup. It will create the database `hpms_db` (if missing), verify and construct all database schemas, and seed demo accounts and records. You do **not** need to manually load SQL dumps.

### 2. Dependency Installation
From the root workspace directory, run:
```bash
npm run install-all
```
This will automatically install npm packages for both the `/backend` and `/frontend` directories.

### 3. Running in Development
To start both the Node.js Express server and the Vite React frontend concurrently:
```bash
npm run dev
```

Once running:
- **Frontend URL**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## Quick-Access Demo Credentials

We've pre-seeded the database with testing accounts. You can type them in or click the **Quick Access Buttons** on the login page for rapid role-testing:

| Role | Username | Password | Access Details |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `adminpassword` | Full database control, registers staff/doctors, reviews security audit logs. |
| **Doctor** | `dr_smith` | `doctorpassword` | Document diagnosis and prescriptions, review schedules, export PDFs. |
| **Receptionist** | `receptionist` | `receptionpassword` | Intake patients, schedule and reschedule appointments, review calendar. |
| **Patient** | `john_doe` | `patientpassword` | Search doctors by specialty, book consultations, read prescription Rx, download reports. |

---

## Security & Compliance Note
- **Clinical Privacy (HIPAA)**: Clinical record routes (`/api/records`) are completely restricted from Receptionist logins. Only attending Doctors, Admins, and the corresponding Patient themselves can access diagnoses and prescriptions.
- **Traceability**: All actions (registrations, scheduling updates, database initializations, clinical edits) write a transaction log to the `audit_logs` table detailing timestamps and originating IP addresses.
