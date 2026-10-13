# Attendance Checker – Addiy Dot Code Education System

[![Live Demo](https://img.shields.io/badge/Demo-Live_Portal-brightgreen.svg)](https://addiybaba1.github.io/attendance-checker/)
[![Platform](https://img.shields.io/badge/Platform-GitHub_Pages-blue.svg)](https://pages.github.com/)
[![Tech Stack](https://img.shields.io/badge/Stack-HTML5_%7C_CSS3_%7C_ES6+-orange.svg)](#tech-stack)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](#license)

A modern, high-performance web platform designed for educational institutions to automate the cross-verification of faculty records against batch-wise student attendance reports. Built with a 100% serverless, client-side architecture suitable for free hosting on GitHub Pages.

---

## 🚀 Live Demo

**Portal URL:** [https://addiybaba1.github.io/attendance-checker/](https://addiybaba1.github.io/attendance-checker/)

### 🧪 Demo User Credentials
For review and evaluation, use the pre-configured user credentials below:

| Field | Value |
| :--- | :--- |
| **Portal Access** | User Access (Coupon) |
| **Username** | `testuser` |
| **Password** | `test123` |
| **Coupon Code** | `OSQ-TEST-2H` |
| **Session Validity** | 2 Hours (Active Countdown) |

---

## ✨ Features & Architecture

### 📊 Automated Attendance Reconciliation
- **Wide-Format Teacher Processing:** Analyzes multi-date faculty attendance sheets.
- **Long-Format Student Processing:** Indexes large student datasets across dates, IDs, and batches.
- **Mismatch Diagnostics:** Identifies discrepancies (Present vs. Absent) with comprehensive Excel export options (Full Report or Mismatches Only).

### 🛡️ Administrative Portal
- **Centralized Dashboard:** Real-time metrics for total users, active sessions, and expired credentials.
- **User Provisioning:** On-demand account creation with customizable access parameters.
- **Automated Messaging:** Single-click clipboard template for dispatching login credentials via WhatsApp or email.

### 🎟️ 2-Hour Auto-Expiring Coupon Engine
- **Unique Code Generator:** Generates formatted random tokens (`OSQ-XXXX-XX`).
- **Real-Time Countdown:** Dynamic header indicator tracking session time remaining.
- **Automated Session Termination:** Instantly revokes system access upon expiration of the 2-hour window.

### 💾 Zero-Backend Data Persistence
- Client-side JSON database powered by Web Storage APIs.
- One-click **JSON Database Export** and **JSON Restore** utility for data backup across devices.

---

## 🛠️ Tech Stack

- **Core:** HTML5, Modern Vanilla JavaScript (ES6+)
- **Styling:** Vanilla CSS3 with glassmorphism design tokens & responsive layouts
- **Excel Engine:** [SheetJS (XLSX.js)](https://sheetjs.com/)
- **Icons & Fonts:** Font Awesome 6.5, Google Fonts (Inter)
- **Deployment:** GitHub Pages (Static hosting)

---

## 📁 Repository Structure

```text
├── index.html       # Primary application gateway and portal interfaces
├── style.css        # Main stylesheet for analytical UI and comparisons
├── admin.css        # Administrative dashboard and modal component styles
├── app.js           # Excel spreadsheet ingestion and comparison algorithms
├── auth.js          # Authentication controller, countdown engine & JSON storage
├── .gitignore       # Repository exclusion configuration
└── README.md        # Technical documentation
```

---

## 📄 License

This project is licensed under the MIT License.  
Developed for **Addiy Dot Code Education System**.
