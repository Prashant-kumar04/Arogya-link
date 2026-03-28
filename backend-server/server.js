// backend-server/server.js - Main Express server with all routes
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname workaround for ESM + load .env from same folder as server.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const DIST_PATH = path.join(__dirname, '..', 'dist');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Health check for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(DIST_PATH));

// Environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arogya_admin_2024';

// ----------------------------
// In-memory stores (declare FIRST before any routes that use them)
// ----------------------------

// In-memory OTP storage: { phone → { otp, expiresAt, sentAt, is_used } }
const otpStore = {};

// Verified phone numbers (for registration flow)
const verifiedPhonesStore = new Set();

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------------
// AI Proxy (Unified single-URL access)
// ----------------------------
app.use('/ai-api', async (req, res) => {
  try {
    const targetUrl = `${FASTAPI_URL}${req.originalUrl.replace('/ai-api', '')}`;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      ...(req.method !== 'GET' ? { body: JSON.stringify(req.body) } : {}),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('AI Proxy Error:', err);
    res.status(502).json({ error: 'AI backend (FastAPI) not reachable' });
  }
});

// ----------------------------
// Admin OTP endpoint (must be before catch-all)
// ----------------------------
app.get('/admin/otps', (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const otpRecords = Object.entries(otpStore).map(([phone, data]) => ({
    phone,
    otp: data.otp,
    created_at: data.sentAt,
    expires_at: data.expiresAt,
    is_used: data.is_used || false,
  }));
  res.json(otpRecords);
});

// (verifiedPhones moved to top of file)

// ----------------------------
// Middleware: Verify JWT
// ----------------------------
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ----------------------------
// STEP 2: Authentication Routes
// ----------------------------

/**
 * POST /auth/send-otp
 * Body: { phone }
 * Response: { success, message }
 */
app.post('/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    // ✅ Indian phone validation: +91 followed by 10 digits starting with 6-9
    const cleaned = (phone || '').replace(/\s+/g, '');
    const indianMobile = /^\+91[6-9]\d{9}$/.test(cleaned);
    if (!cleaned || !indianMobile) {
      return res.status(400).json({ error: 'Invalid Indian mobile number. Must be +91 followed by 10 digits (starting with 6-9).' });
    }

    // Rate limit check: ensure OTP wasn't sent in last 30 seconds
    if (otpStore[phone]) {
      const { sentAt } = otpStore[phone];
      const secondsElapsed = (Date.now() - sentAt) / 1000;
      if (secondsElapsed < 30) {
        return res.status(429).json({
          error: 'OTP sent too recently. Please wait before requesting again.',
          retryAfter: Math.ceil(30 - secondsElapsed),
        });
      }
    }

    // Generate a truly random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Print OTP clearly in the NODE terminal
    console.log(`\n${'='.repeat(40)}`);
    console.log(`🚀 NEW OTP REQUEST`);
    console.log(`📱 PHONE : ${phone}`);
    console.log(`🔑 OTP   : ${otp}`);
    console.log(`⏱  VALID  : 2 minutes`);
    console.log(`${'='.repeat(40)}\n`);

    // Store in memory with 2-minute expiry
    otpStore[phone] = {
      otp,
      expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
      sentAt: Date.now(),
    };


    // Also log to FastAPI if available (non-blocking)
    try {
      await fetch(`${FASTAPI_URL}/internal/log-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
    } catch (err) {
      // FastAPI not running is fine — OTP is already printed above
    }

    return res.json({ success: true, message: 'OTP sent. Check backend terminal.' });

  } catch (err) {
    console.error('Error sending OTP:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { phone, otp }
 * Response: { exists, token?, user? } or { error }
 */
app.post('/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Check OTP exists
    if (!otpStore[phone]) {
      return res.status(404).json({ error: 'OTP not found or expired' });
    }

    const { otp: storedOtp, expiresAt } = otpStore[phone];

    // Check expiry (2 minutes)
    if (Date.now() > expiresAt) {
      delete otpStore[phone];
      return res.status(410).json({ error: 'OTP expired' });
    }

    // Check OTP matches
    if (otp !== storedOtp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Mark this phone as verified for registration
    verifiedPhonesStore.add(phone);

    // Check if user exists in Supabase
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, phone, name')
      .eq('phone', phone)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      console.warn('⚠️ Supabase not reachable, using mock profile for testing.');
      // FALLBACK: If Supabase fails locally, don't crash, just create a mock user
      const mockUser = { id: `local_${Date.now()}`, phone, name: 'Local Test User' };
      const token = jwt.sign(
        { user_id: mockUser.id, phone: mockUser.phone },
        JWT_SECRET || 'local_secret',
        { expiresIn: '30d' }
      );
      return res.json({ exists: true, token, user: mockUser });
    }

    // Delete OTP from memory
    delete otpStore[phone];

    if (users) {
      // User exists: generate JWT and return
      const token = jwt.sign(
        { user_id: users.id, phone: users.phone },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        exists: true,
        token,
        user: {
          id: users.id,
          phone: users.phone,
          name: users.name,
        },
      });
    } else {
      // User does not exist: return exists:false for frontend to show name input modal
      return res.json({
        exists: false,
        message: 'User not found. Please complete registration.',
      });
    }
  } catch (err) {
    console.error('CRITICAL ERROR in verify-otp:', err);
    return res.status(500).json({
      error: 'Server error',
      details: err.message || 'Unknown error'
    });
  }
});

/**
 * POST /auth/register
 * Body: { phone, name }
 * Response: { token, user }
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { phone, name } = req.body;

    // Verify this phone had a recently verified OTP session
    if (!verifiedPhonesStore.has(phone)) {
      return res.status(400).json({ error: 'Phone not verified with OTP' });
    }

    // Insert into Supabase users table
    // Note: If you face RLS issues, ensure you specify the service_role key in .env
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ phone, name, created_at: new Date() }])
      .select('id, phone, name')
      .single();

    if (insertError) {
      console.log(`\n${'❌'.repeat(25)}`);
      console.log('--- Database Registration Error ---');
      console.log('Error Message:', insertError.message);
      console.log('Error Code:', insertError.code);
      console.log(`${'❌'.repeat(25)}\n`);

      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'यह नंबर पहले से ही पंजीकृत है · Phone already registered' });
      }

      return res.status(500).json({ error: `Database error: ${insertError.message}` });
    }

    // Remove from verified set
    verifiedPhonesStore.delete(phone);

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, phone: newUser.phone, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        name: newUser.name,
      },
    });
  } catch (err) {
    console.error('Error registering user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// ----------------------------
// STEP 9: Trusted Contacts Routes
// ----------------------------

/**
 * POST /contacts/add
 * JWT required
 * Body: { contact_name, contact_phone }
 */
app.post('/contacts/add', verifyJWT, async (req, res) => {
  try {
    const { contact_name, contact_phone } = req.body;
    const { id: user_id } = req.user;

    if (!contact_name || !contact_phone) {
      return res.status(400).json({ error: 'Missing contact_name or contact_phone' });
    }

    // Fix phone number format (ensure +91)
    const formattedPhone = contact_phone.startsWith('+91') ? contact_phone : `+91${contact_phone.replace(/\D/g, '').slice(-10)}`;

    // Check if contact phone number is an app user
    const { data: contactUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', formattedPhone)
      .single();

    const isAppUser = !!contactUser;

    // Insert contact
    const { data: contact, error: insertError } = await supabase
      .from('trusted_contacts')
      .insert([
        {
          user_id,
          contact_name,
          contact_phone: formattedPhone,
          is_app_user: isAppUser,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      // ✅ LOGGING FOR RLS DEBUGGING
      console.log(`\n${'❌'.repeat(25)}`);
      console.log('--- Database Contact Error ---');
      console.log('Code:', insertError.code);
      console.log('Message:', insertError.message);
      if (insertError.code === '42501') {
        console.warn('💡 ACTION REQUIRED: Run the SQL script DISABLE_RLS.sql in Supabase.');
      }
      console.log(`${'❌'.repeat(25)}\n`);

      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'You have already added this contact number.' });
      }
      return res.status(500).json({ error: `Database error: ${insertError.message}` });
    }

    return res.status(201).json(contact);
  } catch (err) {
    console.error('Error adding contact:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});



/**
 * GET /contacts
 * JWT required
 */
app.get('/contacts', verifyJWT, async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const { data: contacts, error } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json(contacts);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


/**
 * DELETE /contacts/:contact_id
 * JWT required
 */
app.delete('/contacts/:contact_id', verifyJWT, async (req, res) => {
  try {
    const { contact_id } = req.params;
    const { id: user_id } = req.user;

    // Verify ownership and delete in one step
    const { error: deleteError } = await supabase
      .from('trusted_contacts')
      .delete()
      .match({ id: contact_id, user_id: user_id });

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contact:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /emergency-alert
 * JWT required
 * Body: { reason }
 */
app.post('/emergency-alert', verifyJWT, async (req, res) => {
  try {
    const { id: user_id, name: userName } = req.user;
    const {
      reason = 'Manual emergency alert triggered',
      location = null
    } = req.body;

    const locationText = location
      ? `\n📍 Location: ${location.mapsUrl}`
      : '\n📍 Location: Not available';

    // 1. Fetch trusted contacts for current user
    const { data: contacts, error: contactError } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', user_id);

    if (contactError) throw contactError;

    let sentCount = 0;

    // 2. Loop through contacts and send notifications to app users
    for (const contact of contacts) {
      // Find the user ID for this contact's phone
      const { data: contactUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', contact.contact_phone)
        .single();

      if (contactUser) {
        // Create an in-app notification
        await supabase.from('notifications').insert([
          {
            sender_user_id: user_id,
            receiver_user_id: contactUser.id,
            message: `🚨 HEALTH ALERT from ${userName}: ${reason}${locationText}`,
            type: 'emergency',
            is_read: false,
            created_at: new Date(),
          },
        ]);

        // If not already marked as app user, update it
        if (!contact.is_app_user) {
          await supabase
            .from('trusted_contacts')
            .update({ is_app_user: true })
            .eq('id', contact.id);
        }
        sentCount++;
      }
    }

    return res.json({ success: true, sent_to: sentCount });

  } catch (err) {
    console.error('Error sending emergency alert:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// ----------------------------
// STEP 11: Notifications Routes
// ----------------------------

/**
 * GET /notifications
 * JWT required - fetches unread notifications for current user
 */
app.get('/notifications', verifyJWT, async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('receiver_user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PATCH /notifications/read
 * JWT required
 * Body: { notification_ids: [...] }
 */
app.patch('/notifications/read', verifyJWT, async (req, res) => {
  try {
    const { notification_ids } = req.body;

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({ error: 'Invalid notification_ids' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date() })
      .in('id', notification_ids);

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Internal: Create notification (called from emergency trigger)
 * For now, manually called; future WebSocket integration can trigger this
 */
app.post('/notifications/create', async (req, res) => {
  try {
    const { sender_user_id, receiver_user_id, message, type } = req.body;

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([
        {
          sender_user_id,
          receiver_user_id,
          message,
          type,
          is_read: false,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------
// STEP 10: Device Registration Routes
// ----------------------------

/**
 * POST /device/register
 * JWT required
 * Body: { device_type, device_id }
 */
app.post('/device/register', verifyJWT, async (req, res) => {
  try {
    const { device_type, device_id } = req.body;
    const { id: user_id } = req.user;

    if (!device_type || !device_id) {
      return res.status(400).json({ error: 'Missing device_type or device_id' });
    }

    const { data: device, error } = await supabase
      .from('devices')
      .insert([
        {
          user_id,
          device_type,
          device_id,
          connected_at: new Date(),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(201).json(device);
  } catch (err) {
    console.error('Error registering device:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /devices
 * JWT required
 */
app.get('/devices', verifyJWT, async (req, res) => {
  try {
    const { user_id } = req.user;

    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json(devices);
  } catch (err) {
    console.error('Error fetching devices:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------
// Utility Routes
// ----------------------------

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  return res.json({ status: 'ok', service: 'arogya-link-backend' });
});

// Root '/' is handled by the catch-all below (serves React index.html)

// ----------------------------
// Error handler
// ----------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// ----------------------------
// Catch-all: Serve React index.html for ALL non-API routes (SPA routing)
// ----------------------------
app.use((req, res, next) => {
  // Only serve index.html for non-API, non-static requests
  if (req.path.startsWith('/auth') ||
    req.path.startsWith('/ai-api') ||
    req.path.startsWith('/contacts') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/admin/otps') ||
    req.path.startsWith('/notifications') ||
    req.path.startsWith('/device') ||
    req.path.startsWith('/emergency-alert') ||
    req.path.startsWith('/devices')) {
    return next();
  }
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// ----------------------------
// Start server
// ----------------------------
// Handle startup errors (like EADDRINUSE)
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
    console.error(`💡 SOLUTION: A backend process is already running on this port.`);
    console.error(`   Please check your other terminal windows or kill the process on port ${PORT}.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', e);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ AROGYA LINK BACKEND RUNNING (FLY.IO READY)`);
  console.log(`🔗 URL     : http://0.0.0.0:${PORT}`);
  console.log(`📡 FASTAPI : ${FASTAPI_URL}`);
  console.log(`${'='.repeat(50)}\n`);
});

