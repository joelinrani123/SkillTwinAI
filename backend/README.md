# SkillTwinAI — Backend

Node.js + Express + MongoDB backend for SkillTwinAI.

---

## Tech Stack

- **Runtime**: Node.js ≥ 18
- **Framework**: Express 4
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **AI / Test Questions**: Groq (llama-3 via groq-sdk)
- **ML**: Random Forest + KNN ensemble (+ optional TensorFlow.js)

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create your `.env` file
```bash
cp .env.example .env
```
Then open `.env` and fill in:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret string |
| `GROQ_API_KEY` | Free key from https://console.groq.com |
| `PORT` | Server port (default 5000) |
| `CORS_ORIGIN` | Frontend URL (e.g. http://localhost:5173) |

### 3. Run in development
```bash
npm run dev
```

### 4. Run in production
```bash
npm start
```

---

## API Routes

| Prefix | Description |
|---|---|
| `POST /api/auth/signup` | Register (candidate / recruiter) |
| `POST /api/auth/login` | Login, returns JWT |
| `GET  /api/auth/me` | Get current user |
| `GET/PUT /api/users/profile` | User profile |
| `GET/POST /api/skills` | Skill management |
| `GET /api/tests/questions/:skill` | AI-generated test questions |
| `POST /api/tests/submit` | Submit test, updates skill level |
| `GET /api/certifications` | Certifications |
| `GET/POST /api/jobs` | Job board |
| `GET /api/candidates` | Recruiter: search candidates |
| `GET/POST /api/messages` | Inbox & messaging |
| `POST /api/ai/chat` | AI career coach chat |
| `POST /api/ml/predict` | ML profile prediction |
| `GET /api/admin/stats` | Admin dashboard stats |

---

## Project Structure

```
├── server.js          # Entry point
├── .env.example       # Environment variable template
├── models/            # Mongoose schemas
│   ├── User.js
│   ├── Job.js
│   ├── Message.js
│   ├── Certification.js
│   ├── LearningPath.js
│   └── ...
├── routes/            # Express routers
│   ├── auth.js
│   ├── users.js
│   ├── skills.js
│   ├── tests.js
│   ├── jobs.js
│   ├── messages.js
│   ├── ai.js
│   ├── admin.js
│   └── ...
├── middleware/
│   ├── auth.js        # JWT verification
│   └── requireRole.js # Role-based access
├── services/
│   └── groqService.js # Groq AI integration
└── ml/
    ├── mlService.js   # ML ensemble (RF + KNN + TF)
    └── dataset.csv    # Kaggle-derived training data
```

---

## Notes

- **Groq API key is free** — get one at https://console.groq.com. Without it, AI features (test questions, chat, learning path) won't work, but all other features still function.
- **MongoDB**: use MongoDB Atlas (free tier) for cloud hosting, or run locally with `mongod`.
- **TensorFlow.js** is optional — install `@tensorflow/tfjs-node` for the neural network layer of the ML ensemble. The RF + KNN ensemble works without it.
