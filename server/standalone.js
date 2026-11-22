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
];
const llmFallback = createLlmFallback();

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_req, res) => res.send('ok'));

app.post('/api/chatbot/message', async (req, res) => {
  const { message, context, history, profile } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'message is required' });
  const student = { name: 'Demo Student', branch: 'IT', cgpa: 8, backlogs: 0, skills: [], ...(profile || {}) };
  const deps = { getStudent: async () => student, getOpenJobs: async () => JOBS, llmFallback: llmFallback || undefined };
  res.json(await handleMessage({ message, context, history, userId: 'demo', deps }));
});

app.listen(process.env.PORT || 3000, () => console.log('Placement chatbot demo running'));
