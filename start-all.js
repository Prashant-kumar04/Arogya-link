#!/usr/bin/env node

import { spawn } from 'child_process';
import os from 'os';
import chalk from 'chalk';
import QRCode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const FRONTEND_PORT = 5173;
const BACKEND_PORT = 3001;
const FASTAPI_PORT = 8000;
const frontendURL = `http://${localIP}:${FRONTEND_PORT}`;

console.log(chalk.bold.cyan('\n========================================'));
console.log(chalk.bold.cyan('  AROGYA LINK - COMPLETE APP LAUNCHER'));
console.log(chalk.bold.cyan('========================================\n'));

let processesStarted = 0;
const totalProcesses = 3;

function checkAllRunning() {
  if (processesStarted === totalProcesses) {
    setTimeout(() => {
      displayQRAndInfo();
    }, 3000);
  }
}

function displayQRAndInfo() {
  console.log(chalk.bold.yellow('\n\n============================================\n'));
  console.log(chalk.bold.cyan('SCAN THIS QR CODE WITH YOUR PHONE:'));
  console.log(chalk.gray('==========================================\n'));
  
  QRCode.generate(frontendURL, { small: true });
  
  console.log(chalk.gray('==========================================\n'));
  console.log(chalk.bold.green(`SUCCESS - Frontend URL: ${frontendURL}`));
  console.log(chalk.bold.green(`Local IP: ${localIP}`));
  console.log(chalk.white(`\nVisit: ${frontendURL}\n`));
  
  console.log(chalk.bold.blue('BACKEND ENDPOINTS:'));
  console.log(chalk.white(`Auth Backend: http://localhost:${BACKEND_PORT}`));
  console.log(chalk.white(`ML Model: http://localhost:${FASTAPI_PORT}`));
  
  console.log(chalk.bold.yellow('\nTEST CREDENTIALS:'));
  console.log(chalk.white('Phone: +1234567890'));
  console.log(chalk.white('OTP: Check backend server terminal'));
  
  console.log(chalk.bold.green('\nALL SERVICES RUNNING!'));
  console.log(chalk.gray('==========================================\n'));
}

// Start Backend Server
console.log(chalk.blue('Starting Backend Server (Port 3001)...'));
const backendProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend-server'),
  stdio: 'inherit',
  detached: false
});

backendProcess.on('error', (err) => {
  console.error(chalk.red('Backend Error:'), err.message);
});

backendProcess.on('spawn', () => {
  processesStarted++;
  console.log(chalk.green('Backend Server spawned'));
  checkAllRunning();
});

// Start FastAPI Server
console.log(chalk.blue('Starting FastAPI ML Model (Port 8000)...'));
const fastAPIProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  detached: false
});

fastAPIProcess.on('error', (err) => {
  console.error(chalk.red('FastAPI Error:'), err.message);
});

fastAPIProcess.on('spawn', () => {
  processesStarted++;
  console.log(chalk.green('FastAPI spawned'));
  checkAllRunning();
});

// Start Frontend
console.log(chalk.blue('Starting Frontend (Port 5173)...'));
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  detached: false
});

frontendProcess.on('error', (err) => {
  console.error(chalk.red('Frontend Error:'), err.message);
});

frontendProcess.on('spawn', () => {
  processesStarted++;
  console.log(chalk.green('Frontend spawned'));
  checkAllRunning();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nShutting down all services...'));
  
  backendProcess.kill();
  fastAPIProcess.kill();
  frontendProcess.kill();
  
  setTimeout(() => {
    console.log(chalk.green('All services stopped'));
    process.exit(0);
  }, 1000);
});

console.log(chalk.yellow('\nWaiting for services to start...\n'));
