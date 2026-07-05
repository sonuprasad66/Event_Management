# Event Management Portal

A full-stack Event Management Portal where users can create and browse events, and admins can manage everything from a dedicated panel — built with Node.js, React, MySQL, and real-time Socket.IO.

---

## 📌 Summary

Event Management Portal is a complete web application that allows users to log in, create events with multiple photos, and browse published events filtered by timezone. Admins get a powerful dashboard to manage all events, users, and categories.

Key highlights:
- Only **one active login per user** at a time — logging in from a second browser instantly logs out the first session in real time
- Events are **timezone-aware** — stored in UTC and displayed in the viewer's local timezone
- Events are **hidden until their publish time** arrives
- **Nested categories** — categories can be placed inside other categories to any depth
- **Admin panel** with full control over events, users, and categories

---

## 🚀 How to Run

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** v18 or higher — [https://nodejs.org](https://nodejs.org)
- **MySQL 8** — [https://dev.mysql.com/downloads/mysql](https://dev.mysql.com/downloads/mysql)
- A code editor like **VS Code** — [https://code.visualstudio.com](https://code.visualstudio.com)

---

### Step 1 — Open the Project

1. Extract the ZIP file to a folder on your computer
2. Open that folder in VS Code (or any editor)
3. You will see two folders: `server/` and `client/`

---

### Step 2 — Set Up the Database

Open **MySQL** and create the database:

```sql
CREATE DATABASE eventmanagement;
```

---

### Step 3 — Configure Backend Environment

Open `server/.env` and update your MySQL password:

```env
NODE_ENV=development
PORT=8080
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/eventmanagement"
JWT_SECRET=super_secret_jwt_key_event_management_2024
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

> Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL root password.

---

### Step 4 — Run the Backend

Open a terminal, navigate to the `server` folder and run these commands **in order**:

```bash
cd server

npm install

npm run prisma:generate

npx prisma db push

npm run seed

npm run dev
```

| Command | What it does |
|---------|-------------|
| `npm install` | Installs all backend dependencies |
| `npm run prisma:generate` | Generates the database client from schema |
| `npx prisma db push` | Creates all tables in MySQL |
| `npm run seed` | Inserts demo admin, users, categories, and events |
| `npm run dev` | Starts the backend server on **http://localhost:8080** |

---

### Step 5 — Run the Frontend

Open a **new terminal**, navigate to the `client` folder:

```bash
cd client

npm install

npm run dev
```

| Command | What it does |
|---------|-------------|
| `npm install` | Installs all frontend dependencies |
| `npm run dev` | Starts the frontend on **http://localhost:5173** |

---

### Step 6 — Open the App

Open your browser and go to:

```
http://localhost:5173
```

Login with the demo credentials below.

---

## 🔑 Demo Credentials

| Role  | Username    | Password    |
|-------|-------------|-------------|
| Admin | `admin`     | `Admin@123` |
| User  | `demo_user` | `User@123`  |

---

## ✨ Features

### General
- Secure login with **username and password**
- **Single login enforcement** — logging in from a new browser/device logs out all other sessions instantly via real-time notification
- **Rate limiting** on login — blocked after 5 failed attempts for 15 minutes
- **JWT-based authentication** — all API requests are verified with a token
- **Timezone-aware events** — events display in the viewer's local timezone
- Events are **hidden from the public** until their scheduled publish time arrives
- Upload up to **5 photos per event** (JPEG, PNG, WebP — max 5MB each)

### Soft Delete vs Permanent Delete
- **Soft delete** — hides the event from public view, can be restored later
- **Permanent delete** — removes the event and all its media files forever (admin only, requires soft delete first)

---

## 👑 Admin Access

Login as `admin` to access the full admin panel at `/admin/dashboard`.

**Dashboard**
- Summary cards: Total Events, Published, Waiting, Deleted, Total Users

**Events Management** (`/admin/events`)
- View all events with filters: All, Published, Waiting, Deleted
- Search events by title or description
- Filter by category
- See event image, title, creator, category, publish time, media count, and status
- **Add new event** directly from the admin panel (with photo upload)
- **Soft delete** an active event
- **Restore** a soft-deleted event
- **Permanently delete** a soft-deleted event (removes media files too)

**Categories Management** (`/admin/categories`)
- View all categories as an expandable nested tree
- **Add root category** or add a **child category** inside any existing one
- Edit category name or move it to a different parent
- Delete a category (only if it has no children or events)

**Users Management** (`/admin/users`)
- View all registered users with their role, timezone, event count, and join date
- Search users by username or email
- **Add new user** with username, email, password, role (Admin/User), and timezone

---

## 👤 User Access

Login as `demo_user` to use the standard user experience.

**Events List** (`/events`)
- Browse all published events in a responsive grid
- Search by keyword
- Filter by category
- Sort by publish date, created date, or title
- All times shown in your **local browser timezone**

**Event Detail** (`/events/:id`)
- Full event description
- Image gallery with thumbnail navigation
- Organizer name, category, publish time, and timezone info

**Create Event** (`/events/create`)
- Fill in title, description, category, publish date/time, and timezone
- Upload up to 5 photos with live previews before submitting
- Event will not appear in the list until the publish time arrives

**Delete own event** — users can soft-delete events they created

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | HTTP server and REST API |
| **TypeScript** | Type-safe backend code |
| **Prisma ORM** | Database queries and schema management |
| **MySQL 8** | Relational database |
| **Socket.IO** | Real-time forced logout between browser sessions |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Multer** | File/photo uploads (local storage) |
| **Zod** | Request validation |
| **Luxon** | Timezone conversion |
| **express-rate-limit** | Login rate limiting |
| **Helmet + CORS** | Security headers |
| **ESLint** | Code linting |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19 + Vite** | UI framework and dev server |
| **TypeScript** | Type-safe frontend code |
| **Tailwind CSS** | Styling |
| **React Router v7** | Client-side routing |
| **TanStack Query** | Server state, caching, mutations |
| **Axios** | HTTP API client |
| **React Hook Form + Zod** | Form handling and validation |
| **Zustand** | Auth state management |
| **Socket.IO Client** | Real-time session events |
| **Lucide React** | Icons |
| **React Hot Toast** | Notifications |
| **ESLint** | Code linting |

---

## 📁 Project Structure

```
event-management-portal/
├── server/                  ← Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/     API logic
│   │   ├── routes/          API route definitions
│   │   ├── middlewares/     Auth, upload, error handling
│   │   ├── validators/      Zod schemas
│   │   ├── sockets/         Socket.IO real-time logic
│   │   ├── config/          DB and environment config
│   │   ├── utils/           Helpers (response, error, async)
│   │   └── scripts/         seed.ts
│   ├── prisma/
│   │   └── schema.prisma    Database schema
│   ├── uploads/             Uploaded images (auto-created)
│   └── .env                 Environment variables
│
└── client/                  ← Frontend (React + Vite)
    ├── src/
    │   ├── pages/           Login, Events, Admin pages
    │   ├── components/      Reusable UI components
    │   ├── api/             Axios API functions
    │   ├── store/           Zustand auth store
    │   ├── hooks/           useSocket
    │   └── types/           TypeScript interfaces
    └── .env                 API URL config
```

---

## 🌐 API Overview

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | User | Logout |
| GET | `/api/auth/me` | User | Current user info |
| GET | `/api/events` | User | List published events |
| GET | `/api/events/:id` | User | Event detail |
| POST | `/api/events` | User | Create event |
| DELETE | `/api/events/:id` | User | Soft delete own event |
| GET | `/api/categories/tree` | Public | Nested category tree |
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/events` | Admin | All events with filters |
| POST | `/api/admin/events` | Admin | Create event as admin |
| DELETE | `/api/admin/events/:id/soft` | Admin | Soft delete |
| DELETE | `/api/admin/events/:id/permanent` | Admin | Permanent delete |
| PATCH | `/api/admin/events/:id/restore` | Admin | Restore event |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create new user |
| POST | `/api/categories` | Admin | Create category |
| PATCH | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete category |


---

## ✨ Features

- **JWT Authentication** with single-session enforcement
- **Real-time forced logout** via Socket.IO (login from another browser logs out the first session)
- **Login rate limiting** — 5 attempts per 15 minutes per IP
- **Nested categories** — unlimited depth tree structure
- **Events** with timezone-aware publishing (stored UTC, displayed in user's timezone)
- **Multiple photo uploads** per event (up to 5, local file storage)
- **Soft delete & permanent delete** for events
- **Admin panel** — dashboard stats, event management with filters, category management
- **Public event listing** — only shows published events; future events are hidden
- **Role-based access** — ADMIN and USER roles
- Clean, responsive UI with Tailwind CSS

---

## 🛠 Tech Stack

| Layer     | Technology                                              |
|-----------|----------------------------------------------------------|
| Frontend  | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router, Zustand, Socket.IO Client |
| Backend   | Node.js, Express, TypeScript, Prisma ORM, Socket.IO     |
| Database  | MySQL 8                                                  |
| Auth      | JWT, bcrypt, express-rate-limit                          |
| Uploads   | Multer (local storage)                                   |
| Validation| Zod                                                      |
| Timezone  | Luxon                                                    |

---
