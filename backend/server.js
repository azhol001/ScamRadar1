// ============================================
// ScamRadar — server.js (Backend)
// A simple Node.js + Express server
// This keeps your API key safe on the server
// ============================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config(); // loads your .env file

const app  = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '25mb' })); // allow large image uploads
app.use(express.static(path.join(__dirname, '../frontend'))); // serve frontend files

// ============================================
// HEALTH CHECK
// Visit http://localhost:3000/api/health to test
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ScamRadar backend is running' });
});

// ============================================
// ANALYZE ENDPOINT
// Frontend sends content here, we forward to Claude
// ============================================
app.post('/api/analyze', async (req, res) => {
  const { type, input, imageBase64, imageMediaType } = req.body;

  if (!type || !input) {
    return res.status(400).json({ error: 'Missing type or input' });
  }

  // System prompt — how Claude should behave
  const system = `You are ScamRadar, an expert cybersecurity AI. Analyze content for scams, phishing, deepfakes, and fraud.

Be ACCURATE and fair:
- Well-known legitimate domains (google.com, github.com, youtube.com, amazon.com, microsoft.com, apple.com, etc.) must score 0-10 and get SAFE verdict.
- Only flag content with REAL, SPECIFIC threat indicators.
- Match your score to reality: safe=0-25, mildly suspicious=26-50, likely threat=51-75, confirmed threat=76-100.`;

  // Build the user message based on type
  let messages;

  if (type === 'image' && imageBase64) {
    messages = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
        { type: 'text', text: buildImagePrompt(input) }
      ]
    }];
  } else if (type === 'url') {
    messages = [{ role: 'user', content: buildUrlPrompt(input) }];
  } else {
    messages = [{ role: 'user', content: buildVideoPrompt(input) }];
  }

  try {
    // Call Claude API using the secret key from .env
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // kept secret in .env
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Claude API error');
    }

    const data    = await response.json();
    const rawText = data.content.map(c => c.text || '').join('').trim();
    const clean   = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const result  = JSON.parse(clean);

    res.json(result);

  } catch (err) {
    console.error('Error calling Claude:', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// ============================================
// PROMPT BUILDERS
// ============================================
function buildImagePrompt(filename) {
  return `Analyze this image (filename: "${filename}") for deepfakes, AI generation, manipulation, and scam content.

${jsonInstructions('Image Type,Faces Detected,Manipulation Signs,AI Generation')}`;
}

function buildUrlPrompt(url) {
  return `Analyze this URL for security threats: "${url}"

Is this a known legitimate domain? Check for typosquatting, suspicious TLDs, fake login patterns, scam paths.

${jsonInstructions('Domain Type,TLD Risk,Path Analysis,SSL Expectation')}`;
}

function buildVideoPrompt(filename) {
  return `Analyze this video file for threats. Filename: "${filename}"

${jsonInstructions('File Type,Format,Content Type,Risk Signals')}`;
}

function jsonInstructions(metaKeys) {
  const metaFields = metaKeys.split(',').map(k =>
    `{"key":"${k.trim()}","value":"<value>"}`
  ).join(',');

  return `Respond ONLY with raw JSON:
{
  "riskScore": <integer 0-100>,
  "verdict": "<SAFE|SUSPICIOUS|WARNING|DANGER>",
  "threatType": "<specific label>",
  "confidence": <integer 0-100>,
  "summary": "<2-3 sentence assessment>",
  "flags": [{"severity":"<high|medium|low>","title":"<title>","detail":"<evidence>"}],
  "meta": [${metaFields}],
  "recommendation": "<action for the user>"
}`;
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`\n🚀 ScamRadar backend running at http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/analyze`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
});
