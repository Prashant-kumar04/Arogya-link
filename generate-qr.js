#!/usr/bin/env node

import os from 'os';
import QRCode from 'qrcode-terminal';
import chalk from 'chalk';

import dotenv from 'dotenv';
dotenv.config();

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const PORT = 3001; // Now unified - Frontend is served from Backend Gateway

// If a public URL (like Ngrok) is provided, use it for QR
const publicURL = process.env.VITE_BACKEND_URL;
const displayURL = publicURL || `http://${localIP}:${PORT}`;

console.log(chalk.bold.cyan('\n=========================================='));
console.log(chalk.bold.cyan('  AROGYA LINK - QR CODE SCANNER'));
console.log(chalk.bold.cyan('==========================================\n'));

console.log(chalk.yellow('Scan this QR code with your phone:'));
console.log(chalk.gray('==========================================\n'));

// Generate QR code in terminal
QRCode.generate(displayURL, { small: true });

console.log(chalk.gray('==========================================\n'));
console.log(chalk.bold.green(`SUCCESS - Connection URL: ${displayURL}`));
console.log(chalk.bold.green(`Local IP: ${localIP}`));
console.log(chalk.gray('\nOr visit: ' + chalk.cyan(displayURL) + '\n'));

console.log(chalk.blue.bold('Testing Info:'));
console.log(chalk.white(`Backend Server: http://localhost:3001`));
console.log(chalk.white(`FastAPI Model: http://localhost:8000`));
console.log(chalk.white(`Frontend App: http://${localIP}:${PORT}`));
console.log(chalk.white(`\nTest Phone: +1234567890`));
console.log(chalk.white(`Test OTP: Check terminal running backend\n`));

console.log(chalk.bold.yellow('Instructions:'));
console.log(chalk.white('1. Keep this terminal open'));
console.log(chalk.white('2. Scan QR code with any device on your WiFi'));
console.log(chalk.white('3. App will load on that device'));
console.log(chalk.white('4. Make sure backend servers are running on ports 3001 & 8000\n'));

// Keep script running
setInterval(() => { }, 1000);
