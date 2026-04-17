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
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id, data, updated_at: new Date().toISOString() })
  });
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
    return res.status(500).json({ error: 'Password not configured. Set ADMIN_PASSWORD_HASH environment variable.' });
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

// ─── PUBLIC STUDENT REPORT PAGE ───────────────────────────────────────────────
app.get('/report/:reportId', async (req, res) => {
  try {
    const appData = await sbGet('schoolhub_data', 'main');
    if (!appData || !appData.reports) return res.status(404).send(notFoundPage());
    const report = appData.reports.find(r => r.id === req.params.reportId);
    if (!report) return res.status(404).send(notFoundPage());
    res.send(buildPublicReportHTML(report));
  } catch (e) {
    console.error('GET /report error:', e);
    res.status(500).send('<h1>Erro ao carregar relatório</h1>');
  }
});

function notFoundPage() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Não encontrado</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f3f1;color:#1d2d68;}</style>
  </head><body><div style="text-align:center"><h2>Relatório não encontrado</h2><p>O link pode ter expirado ou é inválido.</p></div></body></html>`;
}

function buildPublicReportHTML(r) {
  const gradeColor = g => g === 'WD' ? '#2a7a3b' : g === 'D' ? '#a05000' : '#c0737a';
  const gradeBg   = g => g === 'WD' ? '#e6f4ea' : g === 'D' ? '#fff3e0' : '#fce8e8';
  const gradeLabel = g => g === 'WD' ? 'Well developed' : g === 'D' ? 'Developing' : 'Needs improvement';
  const skills = ['Speaking', 'Listening', 'Writing', 'Reading', 'Grammar'];
  const periodStr = r.periodStart
    ? r.periodStart.split('-').reverse().join('/') + ' – ' + r.periodEnd.split('-').reverse().join('/')
    : r.date;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const bullets = text => {
    if (!text || !text.trim()) return '<p style="color:#aaa;font-style:italic;">—</p>';
    const lines = text.split(/\n+/).filter(l => l.trim());
    let result = '';
    let startIdx = 0;
    if (lines.length > 1 && !lines[0].trim().startsWith('**')) {
      result += `<p style="margin:0 0 12px;color:#2d3d7a;font-size:14px;line-height:1.6;">${esc(lines[0].trim())}</p>`;
      startIdx = 1;
    }
    lines.slice(startIdx).forEach(l => {
      const trimmed = l.trim();
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/);
      if (boldMatch) {
        result += `<div style="margin-bottom:12px;line-height:1.65;font-size:14px;"><span style="font-weight:700;color:#1d2d68;">${esc(boldMatch[1])}:</span> <span style="color:#2d3d7a;">${esc(boldMatch[2])}</span></div>`;
      } else {
        result += `<div style="display:flex;gap:10px;margin-bottom:8px;line-height:1.6;font-size:14px;">
          <span style="color:#567fb3;flex-shrink:0;font-size:16px;">•</span>
          <span>${esc(trimmed)}</span></div>`;
      }
    });
    return result;
  };

  const avatarHtml = (r.studentAvatar && r.studentAvatar.startsWith('data:'))
    ? `<img src="${r.studentAvatar}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:3px solid #a3c9f1;">`
    : `<div style="width:80px;height:80px;border-radius:50%;background:#1d2d68;display:flex;align-items:center;justify-content:center;font-size:32px;color:white;border:3px solid #a3c9f1;">${(r.studentName||'?').charAt(0).toUpperCase()}</div>`;

  const gradesHtml = skills.map(s => {
    const g = (r.grades || {})[s] || 'NI';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eef3f9;">
      <span style="font-weight:500;color:#1d2d68;">${s}</span>
      <span style="padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;background:${gradeBg(g)};color:${gradeColor(g)};">${g}</span>
    </div>`;
  }).join('');

  const medalsHtml = (r.medals && r.medals.length > 0) ? `
  <div style="margin-top:32px;">
    <h3 style="color:#1d2d68;margin-bottom:16px;font-size:16px;">Medalhas do trimestre</h3>
    <div style="display:flex;flex-wrap:wrap;gap:16px;">
      ${r.medals.map(mid => {
        const names = { frequency_queen:'Consistency Queen', pronunciation_star:'Pronunciation Star', vocabulary_master:'Vocabulary Master', english_only:'English Only' };
        const imgSrc = r.medalImages && r.medalImages[mid] ? r.medalImages[mid] : null;
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;background:#f0f7ff;border-radius:16px;border:1.5px solid #a3c9f1;min-width:110px;text-align:center;">
          ${imgSrc ? `<img src="${imgSrc}" style="width:100px;height:100px;object-fit:contain;">` : `<div style="width:100px;height:100px;background:#dce8f8;border-radius:10px;"></div>`}
          <div style="font-size:12px;font-weight:700;color:#1d2d68;">${names[mid]||mid}</div>
        </div>`;
      }).join('')}
    </div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório — ${esc(r.studentName)}</title>
  <link href="https://api.fontshare.com/v2/css?f[]=garet@400,500,600,700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Garet',sans-serif;background:#f0eee9;color:#1d2d68;min-height:100vh;}
    .page{max-width:720px;margin:0 auto;padding:32px 20px;}
    .header{background:linear-gradient(135deg,#1d2d68,#2a4a9f);border-radius:20px;padding:32px;color:white;display:flex;align-items:center;gap:24px;margin-bottom:28px;}
    .header h1{font-size:22px;font-weight:700;margin-bottom:6px;}
    .header p{font-size:14px;opacity:0.8;}
    .card{background:white;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 2px 12px rgba(29,45,104,0.06);}
    .card h2{font-size:15px;font-weight:700;color:#1d2d68;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #eef3f9;}
    .teacher-msg{background:#f8f6f4;border-left:4px solid #a3c9f1;padding:16px 20px;border-radius:0 12px 12px 0;font-size:14px;line-height:1.7;color:#2d3d7a;}
    @media print{body{background:white;}.page{padding:0;} .no-print{display:none!important;}}
    .btn-print{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:#1d2d68;color:white;border:none;border-radius:10px;font-family:'Garet',sans-serif;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    ${avatarHtml}
    <div>
      <h1>${esc(r.studentName)}</h1>
      <p>Nível ${esc(r.level)}</p>
    </div>
  </div>

  <div class="card">
    <h2>Notas CEFR</h2>
    ${gradesHtml}
  </div>

  ${r.teacherMessage ? `<div class="card"><h2>Mensagem da professora</h2><div class="teacher-msg">${r.teacherMessage.split(/\n+/).filter(l=>l.trim()).map(l=>`<p style="margin-bottom:10px;">${esc(l.trim())}</p>`).join('')}</div></div>` : ''}

  <div style="display:flex;flex-direction:column;gap:20px;margin-bottom:20px;">
    <div class="card"><h2>What is going well</h2>${bullets(r.whatIsGoingWell)}</div>
    <div class="card"><h2>What to improve</h2>${bullets(r.whatToImprove)}</div>
  </div>

  ${medalsHtml ? `<div class="card">${medalsHtml}</div>` : ''}

  <div class="card" style="margin-bottom:20px;">
    <h2>Legenda das notas</h2>
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;gap:14px;align-items:flex-start;">
        <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#e6f4ea;color:#2a7a3b;flex-shrink:0;margin-top:2px;">WD</span>
        <div style="font-size:13px;line-height:1.6;color:#2d3d7a;"><span style="font-weight:700;color:#1d2d68;">Habilidade bem desenvolvida.</span> O aluno está aplicando e integrando as habilidades que aprendeu, de modo independente. De maneira geral, o aluno demonstra entendimento dos conteúdos.</div>
      </div>
      <div style="display:flex;gap:14px;align-items:flex-start;">
        <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#fff3e0;color:#a05000;flex-shrink:0;margin-top:2px;">D</span>
        <div style="font-size:13px;line-height:1.6;color:#2d3d7a;"><span style="font-weight:700;color:#1d2d68;">Habilidade em desenvolvimento.</span> O aluno está no processo de aprendizagem e de aplicação das habilidades que foram ensinadas. O aluno demonstra um desenvolvimento contínuo dos conteúdos.</div>
      </div>
      <div style="display:flex;gap:14px;align-items:flex-start;">
        <span style="padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#fce8e8;color:#c0737a;flex-shrink:0;margin-top:2px;">NI</span>
        <div style="font-size:13px;line-height:1.6;color:#2d3d7a;"><span style="font-weight:700;color:#1d2d68;">Habilidade precisa ser melhor desenvolvida.</span> O aluno demonstra dificuldades em aplicar as habilidades que foram ensinadas. O aluno precisa praticar e se dedicar mais, para desenvolver o entendimento dos conteúdos.</div>
      </div>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button class="btn-print" onclick="window.print()">Salvar como PDF / Imprimir</button>
  </div>
</div>
</body>
</html>`;
}

// ─── FALLBACK ──────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-progress-hub.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ School Hub running at http://localhost:${PORT}\n`);
});
