# 🛡️ ScamRadar — AI-Powered Scam & Deepfake Detector

> Detect scams, phishing links, deepfakes, and fraudulent content using Claude AI — in seconds.

---

## 🎯 What It Does

ScamRadar is a cybersecurity web application that lets users submit suspicious content and get an instant AI-powered threat analysis. Powered by **Claude AI (Anthropic)**.

| Input Type | What It Detects |
|---|---|
| 🖼️ **Image** | Deepfakes, AI-generated faces, manipulated photos, scam imagery |
| 🎬 **Video** | Deepfake indicators, synthetic media, suspicious formats |
| 🔗 **URL / Link** | Phishing, brand impersonation, malicious domains, scam patterns |

---

## 🧠 How the AI Works

Every analysis is **Claude AI reasoning in real time** — not a keyword filter or pattern matcher.

When you submit a URL like `http://paypa1-secure.verify-account.tk/login`, Claude:
1. Reads the full URL structure
2. Notices `paypa1` is a typo of `paypal` (brand impersonation)
3. Flags `.tk` as a high-risk TLD commonly used for phishing
4. Identifies `/login` as a credential-harvesting pattern
5. Returns a risk score of 87/100 with a full explanation

When you submit a real image, Claude **actually sees the image** via its vision API and inspects it for deepfake artifacts, lighting inconsistencies, and manipulation signs.

---

## 📊 Risk Score System

| Score | Verdict | Meaning |
|---|---|---|
| 0–25 | ✅ SAFE | No threats detected |
| 26–50 | 🔵 SUSPICIOUS | Proceed with caution |
| 51–75 | ⚠️ WARNING | High probability of threat |
| 76–100 | 🚫 DANGER | Do not interact |

---

## 🗂️ Project Structure

```
ScamRadar/
│
├── frontend/           ← Everything the user sees
│   ├── index.html      ← Page structure (HTML)
│   ├── style.css       ← Visual design (CSS)
│   └── app.js          ← Logic & Claude API calls (JavaScript)
│
├── backend/            ← Server that keeps API key safe
│   ├── server.js       ← Express server (Node.js)
│   ├── package.json    ← Project dependencies
│   └── .env.example    ← Template for your API key
│
├── .gitignore          ← Prevents secrets from uploading to GitHub
└── README.md           ← This file
```

---

## 🚀 How to Run It

### Option 1 — Frontend Only (Quick Start)
Just open `frontend/index.html` in your browser. No installation needed.
> ⚠️ This exposes your API key in the browser. Fine for demos, not for production.

### Option 2 — With Backend (Recommended)

**Step 1 — Install Node.js**
Download from https://nodejs.org (click the LTS version)

**Step 2 — Set up your API key**
```bash
cd backend
cp .env.example .env
```
Open `.env` and replace `your_api_key_here` with your real Anthropic API key.

**Step 3 — Install dependencies**
```bash
cd backend
npm install
```

**Step 4 — Start the server**
```bash
npm start
```

**Step 5 — Open the app**
Go to http://localhost:3000 in your browser.

---

## 🛠️ Technologies Used

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML | Page structure |
| Frontend | CSS | Visual styling and dark theme |
| Frontend | JavaScript | User interactions and logic |
| AI Engine | Claude API (Anthropic) | Threat analysis and reasoning |
| Backend | Node.js | Server runtime |
| Backend | Express.js | API routing |
| Backend | dotenv | Secure API key management |
| Fonts | Google Fonts (Syne, DM Mono) | Typography |

---

## 🔐 Security Notes

- Your API key is stored in `.env` which is listed in `.gitignore` — it will **never** be uploaded to GitHub
- The backend acts as a secure proxy so the API key is never visible to users
- File uploads are processed in memory and never stored on disk

---

## 💡 Built For

This project was built as part of a hackathon to demonstrate how modern AI (Claude) can be used as an intelligent cybersecurity analysis engine — going beyond simple pattern matching to real reasoning about threats.

---

## 📸 Screenshots

> Add screenshots of your app here after taking them

---

## 🔮 Future Plans

- [ ] VirusTotal API integration for URL scanning
- [ ] Google Safe Browsing API
- [ ] User authentication and saved scan history
- [ ] Browser extension
- [ ] Bulk URL scanning

---

## 👨‍💻 Author

Built with Claude AI (Anthropic) as the analysis engine.
