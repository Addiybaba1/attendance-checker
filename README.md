# 🎓 Attendance Checker – Addiy Dot Code Education System

Teacher & Student Attendance Comparison System with **Admin Portal** & **2-Hour Auto-Expiring Coupon Code Engine**.

100% Static & Client-Side — **GitHub Pages par bilkul FREE live chalne ke liye tayar!**

---

## 🌟 Key Features

1. **👑 Admin Portal (100% Free Lifetime Access)**
   - Admin ke liye koi coupon code ki zaroorat nahi hai.
   - Admin login karke users create kar sakta hai, coupon codes manage kar sakta hai aur pura system use kar sakta hai.

2. **🎟️ 2-Hour Auto-Expiring Coupon System**
   - Jab admin naya user banata hai, system automatically **unique random coupon code** (e.g. `OSQ-4821-XF`) generate karta hai.
   - User login karta hai aur coupon code enter karta hai to uska **2 ghante (120 minutes) ka timer** shuru ho jata hai.
   - Header me live ticking countdown badge show hota hai (`⏳ 01:58:24 Baqi`).
   - **Auto-Kickout:** 2 ghante mukammal hotay hi system user ko foran logout karke lock kar deta hai (`khud system se bahar nikal deta hai`).
   - Dobara use karne ke liye Admin ko us user ke liye naya coupon code generate karke dena hota hai.

3. **💾 JSON Database & Backup (GitHub Pages Compatible)**
   - Sara data browser ke `localStorage` me clean JSON format me store hota hai.
   - Kisi paid server ya database ki zaroorat nahi.
   - Admin panel se **1-Click "Download JSON Backup"** aur **"Upload JSON Restore"** ki sahulat mojood hai.

4. **📲 1-Click WhatsApp Invite Share**
   - Admin panel me har user ke aage WhatsApp icon par click karke mukammal login message (Link, Username, Password, Coupon Code, Validity) copy karke user ko send kiya ja sakta hai.

---

## 🔐 Admin Login Credentials

- **Admin Username:** `AsadAli`
- **Admin Password:** `AsadAli123!@`

*(Admin panel ke andar Settings tab se username aur password tabdeel bhi kiya ja sakta hai.)*

---

## 🚀 GitHub Pages Par Live Karne Ka Tariqa (Deployment Guide)

Aap is project ko GitHub Pages par 2 minute me free live kar sakte hain:

### Step 1: Git Repository Banayein Aur Push Karein
Apne terminal ya command prompt me yeh commands run karein:

```bash
git init
git add .
git commit -m "Initial commit: Attendance Checker with Admin and Coupon System"
git branch -M main
git remote add origin https://github.com/<AAPKA_GITHUB_USERNAME>/<AAPKA_REPO_NAME>.git
git push -u origin main
```

*(Note: `.gitignore` file pehle se configured hai taake `node_modules` upload na ho).*

### Step 2: GitHub Pages Enable Karein
1. GitHub par apne repository page par jayein.
2. Upar **Settings** tab par click karein.
3. Left menu me **Pages** par click karein.
4. **Build and deployment** section me:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` aur folder `/(root)` select karein.
5. **Save** par click karein.

1-2 minute baad aapki website is link par live ho jayegi:
👉 `https://<AAPKA_GITHUB_USERNAME>.github.io/<AAPKA_REPO_NAME>/`

---

## 📁 Folder Structure

```text
Working/
│
├── index.html           # Main Web Application & Login Portals (At Root for GitHub Pages)
├── style.css            # Attendance comparison UI styles & animations
├── admin.css            # Admin dashboard, coupon badges, timer pill styles
├── app.js               # Excel parsing (Teacher vs Student comparison logic)
├── auth.js              # Authentication, 2-hour timer engine, JSON DB & coupon generator
├── .gitignore           # Excludes node_modules from GitHub
├── README.md            # Project documentation & deployment guide
│
└── attendance-checker/  # Subdirectory backup copy
    ├── index.html
    ├── style.css
    ├── admin.css
    ├── app.js
    ├── auth.js
    ├── .gitignore
    └── README.md
```

---

## 👥 User Login Ka Tariqa (User Guide)

1. User website link open karega.
2. **User Access (Coupon)** tab par:
   - Apna **Username** enter karega.
   - Apna **Password** enter karega.
   - Admin se mila hua **2-Hour Coupon Code** enter karega.
3. Login hote hi 2 ghante ka countdown timer shuru ho jayega.
4. 2 ghante pure hotay hi screen lock ho jayegi aur user logout ho jayega.
