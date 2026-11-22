// Standalone demo server for Render: serves the demo page and the chatbot API on sample data (no MongoDB needed).
// For your real portal, use chatbot.routes.js instead (see README).
const express = require('express');
const path = require('path');
const { handleMessage } = require('./chatbot.service');
const { createLlmFallback } = require('./llm');

const day = 864e5;
const J = (id, title, company, description, days, eligibility) => ({ _id: id, title, company, description, deadline: new Date(Date.now() + days * day), eligibility });
const JOBS = [
  J('j1', 'Frontend Developer', 'Pixelforge', 'Build UIs with React, JavaScript, HTML and CSS.', 12, { minCgpa: 7, branches: ['IT', 'CSE'] }),
  J('j2', 'Full Stack Engineer', 'Orbit Labs', 'React, Node.js, Express and MongoDB for internal tools.', 9, { minCgpa: 7.5 }),
  J('j3', 'Backend Developer', 'Kite Systems', 'Node.js, Express, MongoDB and REST API design.', 15, { minCgpa: 7 }),
  J('j4', 'Data Analyst', 'Numera', 'SQL, Python, Excel and Power BI dashboards.', 20, { minCgpa: 7.5 }),
  J('j5', 'Java Developer Trainee', 'Stackwell', 'Java, Spring Boot, SQL and Git.', 7, { minCgpa: 6.5, maxBacklogs: 0 }),
  J('j6', 'ML Engineer Intern', 'Tensora', 'Python, machine learning and SQL.', 18, { minCgpa: 8.5, branches: ['IT', 'CSE'] }),
  J('j7', 'QA Automation Engineer', 'Verity', 'Testing with Selenium, JavaScript and Git.', 10, { minCgpa: 6.5 }),
  J('j8', 'Embedded Systems Trainee', 'Circuita', 'C, C++ and microcontrollers.', 14, { minCgpa: 7, branches: ['ECE'] }),
];
const llmFallback = createLlmFallback();

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
const aiName = () => {
  const want = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (want === 'gemini' || (!want && process.env.GEMINI_API_KEY)) return process.env.GEMINI_API_KEY ? 'gemini' : 'none (LLM_PROVIDER=gemini but GEMINI_API_KEY is missing)';
  if (want === 'anthropic' || (!want && process.env.ANTHROPIC_API_KEY)) return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'none (LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing)';
  return 'none (set GEMINI_API_KEY or ANTHROPIC_API_KEY)';
};
app.get('/health', (_req, res) => res.send('ok'));
app.get('/ai-status', (_req, res) => res.json({ ai: aiName() })); // never reveals the key

app.post('/api/chatbot/message', async (req, res) => {
  const { message, context, history, profile } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'message is required' });
  const student = { name: 'Demo Student', branch: 'IT', cgpa: 8, backlogs: 0, skills: [], ...(profile || {}) };
  const deps = { getStudent: async () => student, getOpenJobs: async () => JOBS, llmFallback: llmFallback || undefined };
  res.json(await handleMessage({ message, context, history, userId: 'demo', deps }));
});

app.listen(process.env.PORT || 3000, () => console.log(`Placement chatbot demo running. AI provider: ${aiName()}`));
