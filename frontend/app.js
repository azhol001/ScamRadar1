// ============================================
// ScamRadar — app.js
// All the logic: tabs, uploads, Claude API calls, results
// ============================================

// --- State ---
let currentTab = 'image';
let selectedFiles = { image: null, video: null };
let scanHistory = [];
let isAnalyzing = false;

// ============================================
// PAGE NAVIGATION
// ============================================
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (name === 'history') renderHistory();
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(type) {
  currentTab = type;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + type).classList.add('active');
  ['image', 'video', 'url'].forEach(t => {
    document.getElementById('panel-' + t).style.display = t === type ? 'block' : 'none';
  });
  document.getElementById('analysis-area').classList.remove('visible');
}

// ============================================
// FILE HANDLING
// ============================================
function handleDragOver(e, type) {
  e.preventDefault();
  document.getElementById('drop-zone-' + type).classList.add('dragover');
}

function handleDragLeave(e, type) {
  document.getElementById('drop-zone-' + type).classList.remove('dragover');
}

function handleDrop(e, type) {
  e.preventDefault();
  document.getElementById('drop-zone-' + type).classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) setFile(type, file);
}

function handleFileSelect(e, type) {
  const file = e.target.files[0];
  if (file) setFile(type, file);
}

function setFile(type, file) {
  selectedFiles[type] = file;
  document.getElementById('preview-name-' + type).textContent = file.name;
  document.getElementById('preview-size-' + type).textContent = formatBytes(file.size);
  document.getElementById('preview-' + type).classList.add('visible');
  document.getElementById('btn-' + type).disabled = false;
}

function clearFile(type) {
  selectedFiles[type] = null;
  document.getElementById('preview-' + type).classList.remove('visible');
  document.getElementById('btn-' + type).disabled = true;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// URL INPUT
// ============================================
function handleUrlInput() {
  const val = document.getElementById('url-input').value.trim();
  document.getElementById('btn-url').disabled = val.length < 4;
}

function setEx(url) {
  document.getElementById('url-input').value = url;
  document.getElementById('btn-url').disabled = false;
}

// ============================================
// STREAM LOG (the step-by-step lines during loading)
// ============================================
const streamSteps = {
  image: [
    'Parsing image file and format...',
    'Checking extension and metadata...',
    'Sending image to Claude for visual inspection...',
    'Claude examining for deepfake artifacts...',
    'Generating risk assessment...'
  ],
  video: [
    'Parsing video filename and format...',
    'Checking codec and container patterns...',
    'Sending to Claude for analysis...',
    'Evaluating deepfake indicators...',
    'Generating risk assessment...'
  ],
  url: [
    'Parsing URL structure...',
    'Analyzing domain name and TLD...',
    'Checking for brand impersonation...',
    'Evaluating path and query parameters...',
    'Claude is reasoning about threat level...'
  ]
};

function addStreamLine(text, done = false) {
  const log = document.getElementById('stream-log');
  const line = document.createElement('div');
  line.className = 'stream-line' + (done ? ' done' : '');
  line.innerHTML = '<div class="stream-dot"></div>' + text;
  log.appendChild(line);
}

// ============================================
// MAIN ANALYSIS TRIGGER
// ============================================
async function startAnalysis(type) {
  if (isAnalyzing) return;
  isAnalyzing = true;

  // Reset UI
  document.getElementById('stream-log').innerHTML = '';
  document.getElementById('analysis-area').classList.add('visible');
  document.getElementById('loading-panel').style.display = 'block';
  document.getElementById('results-panel').style.display = 'none';

  // Start streaming log animation
  const steps = streamSteps[type];
  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) addStreamLine(steps[i++]);
  }, 650);

  // Get input
  const input = type === 'url'
    ? document.getElementById('url-input').value.trim()
    : (selectedFiles[type] ? selectedFiles[type].name : 'uploaded file');

  try {
    const result = await callClaude(type, input, selectedFiles[type]);
    clearInterval(interval);
    addStreamLine('Analysis complete ✓', true);
    isAnalyzing = false;
    setTimeout(() => showResults(result), 400);
    // Save to history
    scanHistory.unshift({
      type,
      input,
      verdict: result.verdict,
      threatType: result.threatType,
      score: Math.round(result.riskScore),
      time: new Date()
    });
  } catch (err) {
    clearInterval(interval);
    isAnalyzing = false;
    document.querySelector('.loading-text').textContent = 'Analysis failed';
    document.querySelector('.loading-sub').textContent = err.message || 'Please try again';
    addStreamLine('Error: ' + (err.message || 'Unknown error'));
    console.error('Claude API error:', err);
  }
}

// ============================================
// CLAUDE API CALL
// This is where we talk to Claude AI
// ============================================
async function callClaude(type, input, file) {

  // System prompt: tells Claude how to behave
  const system = `You are ScamRadar, an expert cybersecurity AI. Analyze content for scams, phishing, deepfakes, and fraud.

Be ACCURATE and fair:
- Well-known legitimate domains (google.com, github.com, youtube.com, amazon.com, microsoft.com, apple.com, twitter.com, linkedin.com, wikipedia.org, etc.) must score 0-10 and get SAFE verdict.
- Only flag content that has REAL, SPECIFIC threat indicators.
- Match your score to reality: safe=0-25, mildly suspicious=26-50, likely threat=51-75, confirmed threat=76-100.
- Explain your reasoning clearly. Do not make things up.`;

  let messages;

  // --- IMAGE: send the actual image to Claude's vision ---
  if (type === 'image' && file && file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    messages = [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: file.type, data: base64 }
        },
        {
          type: 'text',
          text: `Analyze this image (filename: "${input}") for:
- Deepfake manipulation or AI-generated faces
- Lighting and shadow inconsistencies
- Background blending artifacts
- Suspicious text or fake credentials
- Scam content patterns

${buildJsonPrompt('Image Type,Faces Detected,Manipulation Signs,AI Generation')}`
        }
      ]
    }];

  // --- URL: analyze the URL text ---
  } else if (type === 'url') {
    messages = [{
      role: 'user',
      content: `Analyze this URL for security threats: "${input}"

Consider:
- Is this a known legitimate domain? Major trusted sites are SAFE.
- Does the domain use typosquatting? (e.g. paypa1 vs paypal)
- Is the TLD suspicious? (.tk, .xyz, .ml, .ga are high-risk)
- Are there suspicious path patterns? (/login, /verify, /claim, /prize, /reward)
- Does the full URL structure look legitimate?

${buildJsonPrompt('Domain Type,TLD Risk,Path Analysis,SSL Expectation')}`
    }];

  // --- VIDEO: analyze by filename/metadata ---
  } else {
    messages = [{
      role: 'user',
      content: `Analyze this ${type} file for threats. Filename: "${input}"

Assess based on filename patterns, extension, and contextual signals.

${buildJsonPrompt('File Type,Format,Content Type,Risk Signals')}`
    }];
  }

  // Make the API call
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'API error ' + response.status);
  }

  const data = await response.json();

  // Extract text from response and parse JSON
  const rawText = data.content.map(c => c.text || '').join('').trim();
  const cleanText = rawText.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
  return JSON.parse(cleanText);
}

// Helper: tells Claude to respond in JSON
function buildJsonPrompt(metaKeys) {
  const metaFields = metaKeys.split(',').map(k =>
    `{"key":"${k.trim()}","value":"<value>"}`
  ).join(',');

  return `Respond ONLY with raw JSON (no markdown, no preamble, just the JSON object):
{
  "riskScore": <integer 0-100>,
  "verdict": "<SAFE|SUSPICIOUS|WARNING|DANGER>",
  "threatType": "<specific label e.g. 'Phishing Scam', 'Safe Website', 'Deepfake Image'>",
  "confidence": <integer 0-100>,
  "summary": "<2-3 sentence honest assessment>",
  "flags": [
    {"severity":"<high|medium|low>","title":"<short title>","detail":"<specific evidence>"}
  ],
  "meta": [${metaFields}],
  "recommendation": "<clear, specific action for the user>"
}`;
}

// Helper: convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// SHOW RESULTS
// ============================================
function showResults(result) {
  document.getElementById('loading-panel').style.display = 'none';
  document.getElementById('results-panel').style.display = 'block';

  const score   = Math.round(result.riskScore);
  const verdict = result.verdict;
  const colorMap = { SAFE: '#00e5a0', SUSPICIOUS: '#3d9eff', WARNING: '#ffa502', DANGER: '#ff4757' };
  const color   = colorMap[verdict] || '#8a91a8';

  // Verdict badge
  document.getElementById('verdict-badge').className = 'verdict-badge verdict-' + verdict;
  document.getElementById('verdict-badge').textContent = verdict;

  // Animated score ring
  const arc = document.getElementById('score-arc');
  arc.style.stroke = color;
  setTimeout(() => {
    arc.style.transition = 'stroke-dashoffset 1s ease';
    arc.style.strokeDashoffset = 239 - (score / 100) * 239;
  }, 50);

  // Animated score counter
  const scoreEl = document.getElementById('score-display');
  scoreEl.style.color = color;
  let current = 0;
  const counter = setInterval(() => {
    current = Math.min(current + Math.ceil(score / 25), score);
    scoreEl.textContent = current;
    if (current >= score) clearInterval(counter);
  }, 35);

  // Threat type and summary
  document.getElementById('threat-type-label').textContent = result.threatType;
  document.getElementById('threat-summary').textContent = result.summary;

  // Confidence bar
  const conf = Math.round(result.confidence);
  document.getElementById('conf-bar').style.cssText = `width: 0%; background: ${color}`;
  setTimeout(() => { document.getElementById('conf-bar').style.width = conf + '%'; }, 100);
  document.getElementById('conf-label').textContent = 'Confidence: ' + conf + '%';

  // Meta cards
  document.getElementById('meta-grid').innerHTML = (result.meta || []).map(m =>
    `<div class="meta-item">
      <div class="meta-key">${m.key}</div>
      <div class="meta-val">${m.value}</div>
    </div>`
  ).join('');

  // Flags list
  const flagIcons = { high: '🔴', medium: '🟡', low: '🔵' };
  document.getElementById('flags-list').innerHTML = (result.flags || []).map(f =>
    `<div class="flag-item ${f.severity}">
      <div class="flag-icon">${flagIcons[f.severity] || '⚪'}</div>
      <div class="flag-text">
        <strong>${f.title}</strong>
        <span>${f.detail}</span>
      </div>
    </div>`
  ).join('');

  // Recommendation box
  const recMap = {
    SAFE:       { cls: 'safe',       icon: '✅', label: 'Safe to proceed' },
    SUSPICIOUS: { cls: 'suspicious', icon: '🔎', label: 'Proceed with caution' },
    WARNING:    { cls: 'warning',    icon: '⚠️', label: 'High risk detected' },
    DANGER:     { cls: 'danger',     icon: '🚫', label: 'Do not interact' }
  };
  const rec = recMap[verdict] || recMap['SUSPICIOUS'];
  document.getElementById('rec-box-wrap').innerHTML =
    `<div class="rec-box ${rec.cls}">
      <div class="rec-icon">${rec.icon}</div>
      <div class="rec-text">
        <strong>${rec.label}</strong>
        <p>${result.recommendation}</p>
      </div>
    </div>`;

  // Scroll to results
  document.getElementById('analysis-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// HISTORY PAGE
// ============================================
function renderHistory() {
  const list = document.getElementById('history-list');

  if (!scanHistory.length) {
    list.innerHTML = '<div class="empty-state">No scans yet. Run your first analysis to see history here.</div>';
    ['total','danger','warn','safe'].forEach(k => document.getElementById('stat-' + k).textContent = 0);
    return;
  }

  document.getElementById('stat-total').textContent  = scanHistory.length;
  document.getElementById('stat-danger').textContent = scanHistory.filter(s => s.verdict === 'DANGER').length;
  document.getElementById('stat-warn').textContent   = scanHistory.filter(s => s.verdict === 'WARNING' || s.verdict === 'SUSPICIOUS').length;
  document.getElementById('stat-safe').textContent   = scanHistory.filter(s => s.verdict === 'SAFE').length;

  const typeIcons   = { image: '🖼️', video: '🎬', url: '🔗' };
  const scoreColors = { SAFE: 'var(--safe)', SUSPICIOUS: 'var(--info)', WARNING: 'var(--warning)', DANGER: 'var(--danger)' };

  list.innerHTML = scanHistory.map(s =>
    `<div class="history-item">
      <div class="hist-type-icon">${typeIcons[s.type] || '📁'}</div>
      <div class="hist-info">
        <div class="hist-name">${s.input}</div>
        <div class="hist-time">${s.threatType} · ${formatTime(s.time)}</div>
      </div>
      <div class="hist-score" style="color:${scoreColors[s.verdict]};background:${scoreColors[s.verdict]}20">${s.score}/100</div>
    </div>`
  ).join('');
}

function formatTime(date) {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// RESET
// ============================================
function resetScan() {
  document.getElementById('analysis-area').classList.remove('visible');
  document.getElementById('stream-log').innerHTML = '';
  clearFile('image');
  clearFile('video');
  document.getElementById('url-input').value = '';
  document.getElementById('btn-url').disabled = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
