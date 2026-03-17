# Match Energy ⚡

A personal energy usage dashboard where users log appliances and track estimated electricity consumption and costs.

## Stack
- **Frontend**: Next.js (App Router) + Tailwind CSS + Recharts — port 3001
- **Backend**: Express.js + MongoDB/Mongoose — port 3000
- **Auth**: JWT + bcryptjs
- **Dev DB**: MongoDB via Docker

---

## Quick Start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3001
- API: http://localhost:3000

---

## Local Dev Setup

### Backend
```bash
cd server
npm install
# Make sure MongoDB is running (docker compose up mongo)
node index.js
```

### Seed Demo Data
```bash
cd server
node seed.js
# Login: demo@matchenergy.com / demo1234
```

### Frontend
```bash
cd client
npm install
npm run dev   # runs on port 3001
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login, get JWT |
| GET | /api/auth/me | ✓ | Current user |
| GET | /api/appliances | ✓ | List appliances |
| POST | /api/appliances | ✓ | Add appliance |
| PUT | /api/appliances/:id | ✓ | Update appliance |
| DELETE | /api/appliances/:id | ✓ | Remove appliance |
| GET | /api/appliances/summary | ✓ | Dashboard stats |

---

## Data Models

### User
```
email, password (bcrypt), location, ratePerKwh, createdAt
```

### Appliance
```
user (ref), name, type, wattage, hoursPerDay, isActive, createdAt
virtuals: dailyKwh = (wattage × hoursPerDay) / 1000
          monthlyKwh = dailyKwh × 30
```

---

## Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/match-energy
JWT_SECRET=your-secret-here
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```
