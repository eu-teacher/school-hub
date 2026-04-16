const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'schoolhub_secret_change_me';
const DATA_FILE = path.join(__dirname, 'data', 'schoolhub.json');
const AUTH_FILE = path.join(__dirname, 'data', 'auth.json');

// ─── ENSURE DATA FOLDER EXISTS ─────────────────────────────────────────────────
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function readJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading', filePath, e.message);
  }
  return fallback;
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
}

// ─── STATIC FILES (serve the HTML app) ────────────────────────────────────────
app.use(express.static(__dirname));

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────────

// POST /api/login  { password }  → { token }
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const auth = readJSON(AUTH_FILE, null);
  if (!auth || !auth.passwordHash) {
    return res.status(500).json({ error: 'App not set up yet. Run: node setup-password.js' });
  }

  const match = await bcrypt.compare(password, auth.passwordHash);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ user: 'teacher' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// POST /api/change-password  { currentPassword, newPassword }
app.post('/api/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords required' });
  }

  const auth = readJSON(AUTH_FILE, null);
  if (!auth) return res.status(500).json({ error: 'Auth file missing' });

  const match = await bcrypt.compare(currentPassword, auth.passwordHash);
  if (!match) return res.status(401).json({ error: 'Wrong current password' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  writeJSON(AUTH_FILE, { passwordHash });
  res.json({ ok: true });
});

// ─── DATA ROUTES ───────────────────────────────────────────────────────────────

// GET /api/data  → appData JSON
app.get('/api/data', verifyToken, (req, res) => {
  const data = readJSON(DATA_FILE, {
    students: [],
    reports: [],
    schedule: [],
    calendarEvents: []
  });
  res.json(data);
});

// POST /api/data  { ...appData }  → { ok: true }
app.post('/api/data', verifyToken, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  // Ensure required arrays exist
  if (!Array.isArray(data.students)) data.students = [];
  if (!Array.isArray(data.reports)) data.reports = [];
  if (!Array.isArray(data.schedule)) data.schedule = [];
  if (!Array.isArray(data.calendarEvents)) data.calendarEvents = [];

  writeJSON(DATA_FILE, data);
  res.json({ ok: true });
});

// ─── FALLBACK: serve index (SPA) ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-progress-hub.html'));
});

// ─── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ School Hub running at http://localhost:${PORT}`);
  console.log(`   (If first time: run "node setup-password.js" first)\n`);
});
