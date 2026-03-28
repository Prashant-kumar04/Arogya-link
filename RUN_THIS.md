# 🚀 RUN YOUR APP - SIMPLE GUIDE

## Step 1: Open Terminal
Open PowerShell in your project folder:
```
c:\Users\acer\OneDrive\Desktop\new-testing\new_1\new_test2\AI Health Monitoring App
```

## Step 2: Run This ONE Command

```powershell
npm run run
```

That's it! Just `npm run run`

---

## What Happens Next?

1. **FastAPI starts** (Port 8000) - ML prediction model
2. **Node.js Backend starts** (Port 3001) - Authentication server  
3. **React Frontend starts** (Port 5173) - Your app UI

Wait 4-5 seconds...

4. **QR Code appears** in terminal
5. **Scan with your phone** on same WiFi
6. App loads on your phone! ✅

---

## Testing Your App

### Login
- Phone: `+1234567890`
- OTP: Check terminal (will be printed)
- Enter 6-digit OTP

### Health Vitals
- Age: 45
- Heart Rate: 75
- Blood Pressure: 120/80
- SpO2: 98
- Temperature: 98.6

### Click "Score Now"
- Get AI prediction
- See risk level (SAFE/FATIGUE/HEALTH RISK)
- View health recommendations

---

## If Something Goes Wrong

### Issue: "Port 3001 already in use"
```powershell
Stop-Process -Name node -Force
```
Then try again.

### Issue: "Python not found"
Make sure Python is installed:
```powershell
python --version
```

### Issue: "Module not found"
```powershell
npm install
```

---

## Multiple Users on Same WiFi

1. Keep terminal running with `npm run run`
2. On Device 1: Scan QR code
3. On Device 2: Scan same QR code
4. On Device 3: Scan same QR code

Each device gets its own independent session!

---

## Stop Everything

Press `Ctrl+C` in terminal

All services will stop gracefully.

---

## Done! 🎉

Your full-stack health monitoring app is now live and accessible on your local network!
