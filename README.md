# Smart Answer Sheet Evaluation Portal

A full-stack web application that automatically evaluates students' **objective** answer sheets by
comparing submitted answers against an admin-defined answer key. **No OCR / image recognition is
used** — submissions are structured data (JSON / CSV / TXT / text-based PDF) or manually entered.

## Features

- **JWT authentication** for admins (bcrypt password hashing, protected routes).
- **Dashboard** with stat cards, daily-evaluation line chart, exam-statistics bar chart and a
  pass-percentage doughnut chart.
- **Exam management** — create / edit / delete, activate / deactivate, negative marking,
  dynamic question count (20 / 50 / 100 / 200 or any value).
- **Answer key management** — visual A/B/C/D grid stored per question in MySQL.
- **Student management** — full CRUD.
- **Answer evaluation engine** — compares answers, computes correct / wrong / skipped, marks,
  percentage, grade and pass/fail (honours negative marking).
- **Result screen** — responsive question-wise table with green tick (correct), red circle
  (incorrect) and gray dash (not attempted), plus a summary.
- **Professional PDF report** generation (PDFKit) with a Download button.
- **Search & filters** on results (student, exam, subject, date range, result, percentage).

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 18, React Router, Axios, Bootstrap 5, React Hook Form, SweetAlert2, React Icons, Chart.js |
| Backend  | Node.js, Express, JWT, Multer, bcryptjs, CORS, dotenv |
| Database | MySQL (mysql2) |
| PDF      | PDFKit |

## Project Structure

```
Exam-PaperChack/
├── client/        # React (Vite) frontend
│   └── src/
│       ├── components/  pages/  layouts/  hooks/  services/  context/  routes/  assets/
├── server/        # Express backend (MVC)
│   ├── config/    controllers/  middleware/  models/  routes/  services/  utils/
│   ├── uploads/   # uploaded answer files
│   └── pdf/       # generated PDF reports
└── samples/       # example answer files (json/csv/txt)
```

## Prerequisites

- Node.js 18+
- A running MySQL server

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env        # then edit DB credentials & JWT secret
npm install
npm run init-db             # creates the database, tables and a default admin
npm run dev                 # starts http://localhost:5001
```

`init-db` seeds a default admin from `.env`:

```
email:    admin@example.com
password: admin123
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # starts http://localhost:5173 (proxies /api -> :5001)
```

Open http://localhost:5173 and sign in with the default admin.

## Typical Workflow

1. **Create an exam** (set total questions, marks, passing marks, negative marking).
2. **Build its answer key** under *Answer Keys* (pick the exam, click the correct option per question, Save).
3. **Add students**.
4. **Evaluate** under *Evaluate Papers*: pick a student + exam, then either upload a structured
   answer file or enter answers manually, and click *Evaluate*.
5. View the **result** (auto-redirected) and **Download PDF**.
6. Browse all evaluations under *Results & Reports* with search & filters.

## Supported Submission Formats (no OCR)

- **JSON**: `{ "1": "A", "2": "C" }` or `[{ "question_no": 1, "answer": "A" }]`
- **CSV**: `question_no,answer` rows, e.g. `1,A`
- **TXT**: lines like `1:A`, `2 = C`, `3 - B`
- **PDF**: text-based PDFs are parsed for the same `1:A` patterns (not scanned images)

See the `samples/` folder for ready-to-use examples.

## API Reference

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST   | `/api/login` | Admin login (returns JWT) |
| POST   | `/api/logout` | Logout |
| GET    | `/api/me` | Current admin |
| GET    | `/api/dashboard` | Dashboard stats & charts |
| GET/POST/PUT/DELETE | `/api/students[/:id]` | Student CRUD |
| GET/POST/PUT/DELETE | `/api/exams[/:id]` | Exam CRUD |
| PATCH  | `/api/exams/:id/status` | Toggle exam status |
| GET/POST | `/api/answer-keys` | Get (`?exam_id=`) / bulk-save key |
| PUT/DELETE | `/api/answer-keys/:id` | Update one / clear exam key |
| POST   | `/api/evaluate` | Evaluate a submission (multipart) |
| GET    | `/api/results` | List results (supports filters) |
| GET    | `/api/result/:id` | Single result with question details |
| GET    | `/api/result/:id/pdf` | Download PDF report |
| DELETE | `/api/result/:id` | Delete a result |

All routes except `/login` & `/logout` require an `Authorization: Bearer <token>` header.

## Notes

- Marks per question are distributed evenly (`total_marks / total_questions`); wrong answers
  subtract the exam's `negative_mark`. Total marks never drop below zero.
