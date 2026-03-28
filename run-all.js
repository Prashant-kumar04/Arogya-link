#!/usr/bin/env node

import { spawn } from 'child_process';
import os from 'os';
import chalk from 'chalk';
import QRCode from 'qrcode-terminal';

console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║     AROGYA LINK - STARTING ALL SERVICES                ║'));
console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

// Get local IP
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
const services = [];

console.log(chalk.yellow('📡 Starting services...\n'));

// 1. Start FastAPI (Port 8000)
console.log(chalk.blue('1️⃣  Starting FastAPI (ML Model) on port 8000...'));
const fastapi = spawn('python', ['main.py'], {
  cwd: './backend',
  stdio: 'inherit',
  shell: true
});
services.push({ name: 'FastAPI', process: fastapi });

// 2. Start Node.js Backend (Port 3001)
console.log(chalk.blue('2️⃣  Starting Node.js Backend on port 3001...'));
const backend = spawn('npm', ['run', 'dev'], {
  cwd: './backend-server',
  stdio: 'inherit',
  shell: true
});
services.push({ name: 'Backend', process: backend });

// 3. Start React Frontend (Port 5173)
console.log(chalk.blue('3️⃣  Starting React Frontend on port 5173...'));
const frontend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});
services.push({ name: 'Frontend', process: frontend });

// Wait 4 seconds, then show QR code
setTimeout(() => {
  console.log(chalk.bold.green('\n\n✅ ALL SERVICES STARTED!\n'));
  console.log(chalk.bold.cyan('╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║              CONNECT YOUR PHONE TO APP                 ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));
  
  console.log(chalk.bold.yellow('📱 SCAN THIS QR CODE:'));
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  // Generate QR code
  QRCode.generate(`http://${localIP}:5173`, { small: true });
  
  console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.bold.green(`✅ URL: http://${localIP}:5173`));
  console.log(chalk.bold.green(`✅ IP: ${localIP}`));
  console.log(chalk.bold.green(`✅ Port: 5173\n`));
  
  console.log(chalk.blue.bold('📍 Service URLs:'));
  console.log(chalk.white(`   • Frontend: http://${localIP}:5173`));
  console.log(chalk.white(`   • Backend: http://localhost:3001`));
  console.log(chalk.white(`   • ML Model: http://localhost:8000\n`));
  
  console.log(chalk.blue.bold('🧪 Testing:'));
  console.log(chalk.white(`   • Phone Number: +1234567890`));
  console.log(chalk.white(`   • OTP: Check terminal output below\n`));
  
  console.log(chalk.bold.yellow('📝 What to do:'));
  console.log(chalk.white('   1. Scan QR code above with your phone'));
  console.log(chalk.white('   2. App will load on your phone browser'));
  console.log(chalk.white('   3. Use phone number +1234567890'));
  console.log(chalk.white('   4. OTP will be printed in this terminal'));
  console.log(chalk.white('   5. Enter vitals and get health prediction\n'));
  
  console.log(chalk.bold.red('⚠️  KEEP THIS TERMINAL OPEN\n'));
  console.log(chalk.gray('Press Ctrl+C to stop all services\n'));
}, 4000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.bold.red('\n\n🛑 Stopping all services...\n'));
  services.forEach(service => {
    service.process.kill();
  });
  setTimeout(() => {
    console.log(chalk.bold.yellow('All services stopped.\n'));
    process.exit(0);
  }, 1000);
});
