const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'schoolhub_secret_change_me';
const DATA_FILE = path.join(__dirname, 'data', 'schoolhub.json');
const AUTH_FILE = path.join(__dirname, 'data', 'auth.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

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

app.use(express.static(__dirname));

app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  let passwordHash = process.env.ADMIN_PASSWORD_HASH || null;

  if (!passwordHash) {
    const auth = readJSON(AUTH_FILE, null);
    if (auth && auth.passwordHash) passwordHash = auth.passwordHash;
  }

  if (!passwordHash) {
    return res.status(500).json({ error: 'Password not configured. Set ADMIN_PASSWORD_HASH environment variable.' });
  }

  const match = await bcrypt.compare(password, passwordHash);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ user: 'teacher' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

app.get('/api/data', verifyToken, (req, res) => {
  const data = readJSON(DATA_FILE, {
    students: [], reports: [], schedule: [], calendarEvents: []
  });
  res.json(data);
});

app.post('/api/data', verifyToken, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  if (!Array.isArray(data.students)) data.students = [];
  if (!Array.isArray(data.reports)) data.reports = [];
  if (!Array.isArray(data.schedule)) data.schedule = [];
  if (!Array.isArray(data.calendarEvents)) data.calendarEvents = [];

  writeJSON(DATA_FILE, data);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-progress-hub.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ School Hub running at http://localhost:${PORT}\n`);
});
