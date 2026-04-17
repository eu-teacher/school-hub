const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'schoolhub_secret_change_me';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ─── SUPABASE HELPERS ──────────────────────────────────────────────────────────
async function sbGet(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&select=data`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const rows = await res.json();
  return rows && rows.length > 0 ? rows[0].data : null;
}

async function sbUpsert(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id, data, updated_at: new Date().toISOString() })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase error ${res.status}: ${errText}`);
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────
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

// ─── STATIC FILES ──────────────────────────────────────────────────────────────
app.use(express.static(__dirname));

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const passwordHash = process.env.ADMIN_PASSWORD_HASH || null;
  if (!passwordHash) {
    return res.status(500).json({ error: 'Password not configured. Set ADMEN_PASSWORD_HASH environment variable.' });
  }

  const match = await bcrypt.compare(password, passwordHash);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign({ user: 'teacher' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// ─── DATA ──────────────────────────────────────────────────────────────────────
app.get('/api/data', verifyToken, async (req, res) => {
  try {
    const data = await sbGet('schoolhub_data', 'main');
    res.json(data || { students: [], reports: [], schedule: [], calendarEvents: [] });
  } catch (e) {
    console.error('GET /api/data error:', e);
    res.json({ students: [], reports: [], schedule: [], calendarEvents: [] });
  }
});

app.post('/api/data', verifyToken, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  if (!Array.isArray(data.students)) data.students = [];
  if (!Array.isArray(data.reports)) data.reports = [];
  if (!Array.isArray(data.schedule)) data.schedule = [];
  if (!Array.isArray(data.calendarEvents)) data.calendarEvents = [];

  try {
    await sbUpsert('schoolhub_data', 'main', data);
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/data error:', e);
    res.status(500).json({ error: 'Failed to save data', detail: e.message, supabaseUrl: SUPABASE_URL ? 'set' : 'MISSING', supabaseKey: SUPABASE_KEY ? 'set' : 'MISSING' });
  }
});

// ─── FALLBACK ──────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-progress-hub.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ School Hub running at http://localhost:${PORT}\n`);
});
