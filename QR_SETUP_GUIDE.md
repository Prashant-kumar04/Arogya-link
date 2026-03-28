# AROGYA LINK - QR CODE SETUP & DEPLOYMENT GUIDE

## Quick Start - ONE COMMAND TO RULE THEM ALL! 🚀

```powershell
npm install && npm run start-all
```

This single command:
1. ✅ Installs all dependencies (npm packages)
2. ✅ Starts FastAPI ML Model (Port 8000)
3. ✅ Starts Node.js Auth Backend (Port 3001)  
4. ✅ Starts React Frontend (Port 5173)
5. ✅ Generates QR Code in terminal
6. ✅ Displays network URL for phone scanning

---

## Manual Setup (If Needed)

### Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed
- All dependencies installed

### Terminal 1 - FastAPI ML Model (Port 8000)
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Expected Output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

### Terminal 2 - Node.js Backend (Port 3001)
```powershell
cd backend-server
npm install
node server.js
```

Expected Output:
```
✅ AROGYA LINK BACKEND RUNNING
🔗 URL     : http://localhost:3001
📡 FASTAPI : http://localhost:8000
```

---

### Terminal 3 - React Frontend (Port 5173) + QR Code
```powershell
npm install
npm run qr
```

This will display a scannable QR code in your terminal.

---

## QR Code Scanning Instructions

1. **Open Terminal** running `npm run qr` or `npm run start-all`
2. **Your Local Network IP** will be displayed (e.g., 192.168.1.100)
3. **QR Code** will appear in terminal
4. **Scan with Phone Camera** or any QR code reader
5. **Auto-redirects** to `http://192.168.1.100:5173`
6. **App loads** on your device over WiFi

---

## Testing the App

### On Same WiFi Network:

1. **Get QR Code from Terminal**
2. **Scan with any phone on your WiFi**
3. **App opens on phone browser**
4. **Test Login:**
   - Phone: `+1234567890`
   - OTP: Check backend server terminal (printed in console)
   - Enter OTP → Dashboard

### What You Can Test:

- ✅ Phone OTP Authentication
- ✅ Health Vitals Input
- ✅ ML Model Predictions
- ✅ Real-time Risk Scoring
- ✅ User Profiles
- ✅ Emergency Contacts
- ✅ Health History

---

## Network Access Points

| Service | URL | Port | Type |
|---------|-----|------|------|
| Frontend | http://192.168.x.x:5173 | 5173 | Browser |
| Auth Backend | http://localhost:3001 | 3001 | API |
| ML Model | http://localhost:8000 | 8000 | API |
| Supabase | Cloud | - | Database |

---

## Troubleshooting

### ❌ "Port 3001 already in use"
```powershell
# Kill process using port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### ❌ "Module not found"
```powershell
# Reinstall dependencies
rm -r node_modules
npm install
```

### ❌ "Python not found"
```powershell
# Install Python from python.org or use:
python --version
# If not installed, download from https://www.python.org/downloads/
```

### ❌ QR Code won't display
```powershell
# Try manual URL instead
# Get your IP: ipconfig
# Visit: http://YOUR_IP:5173
```

---

## Multiple Users / Devices

All devices on **same WiFi network** can access the app simultaneously:

```
Device 1: Scan QR → http://192.168.1.100:5173
Device 2: Scan QR → http://192.168.1.100:5173  
Device 3: Scan QR → http://192.168.1.100:5173
Device 4: Scan QR → http://192.168.1.100:5173
```

Each user gets:
- Separate login session
- Individual health data
- Personal recommendations
- Independent notifications

---

## Environment Variables

### Backend Server (.env)
```
SUPABASE_URL=https://ucrqvuglbzlroxxngoqo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your_super_secret_jwt_key
FASTAPI_URL=http://localhost:8000
PORT=3001
NODE_ENV=development
```

### FastAPI (.env)
```
MONGODB_URI=optional
DATABASE_NAME=arogya_link
RISK_WARNING_THRESHOLD=35.0
RISK_CRITICAL_THRESHOLD=65.0
```

---

## Production Deployment

For deploying to production:

1. **Frontend**: Deploy to Vercel/Netlify
2. **Backend**: Deploy to Railway/Render
3. **FastAPI**: Deploy to Heroku/AWS
4. **Update env variables** with production URLs

---

## API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to phone
- `POST /auth/verify-otp` - Verify OTP & get token
- `POST /auth/register` - Register new user

### Health Predictions
- `POST /predict` - Get health risk prediction
- `GET /health-history` - Get user's health history
- `POST /vitals` - Ingest new vitals

### User Management
- `GET /profile` - Get user profile
- `POST /profile` - Update profile
- `GET /contacts` - Get emergency contacts
- `POST /contacts` - Add emergency contact

---

## Support & Issues

If you encounter issues:

1. Check all 3 services are running ✅
2. Verify ports 3001, 5173, 8000 are free ✅
3. Check .env file has correct values ✅
4. Ensure WiFi connection is stable ✅
5. Restart all services if stuck ✅

---

## Quick Command Reference

```powershell
# Install everything
npm install

# Start everything (RECOMMENDED)
npm run start-all

# Start just frontend
npm run dev

# Generate QR Code only
npm run qr

# Build for production
npm run build

# Backend only
cd backend-server && npm install && node server.js

# FastAPI only  
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

---

**Ready to launch?** Just run:
```
npm install && npm run start-all
```

Happy testing! 🎉
