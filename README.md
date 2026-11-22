# Placement Chatbot

A simple chatbot for the Placement Preparation and Job Portal (MERN). It recommends jobs, finds skill gaps, and runs interview practice.

## What it does
| Ask | Result |
|---|---|
| "Recommend jobs for me" / "jobs for react and node" | Top 5 open jobs ranked by skill match, CGPA and branch eligibility, with matched and missing skills |
| "What skills am I missing?" | Skills that would unlock the most jobs you are eligible for |
| "Ask me a DBMS question" then "show answer" | Practice Q&A (DSA, OOP, DBMS, OS, CN, JS, React, Node, SQL, Python, Java, HR) |
| "Quant tips", "Resume tips", "Make a study plan" | Aptitude, resume and 8-week plan guidance |

## How it answers
- **With `ANTHROPIC_API_KEY` set (recommended): works like a normal chatbot.** Any placement, interview, coding, aptitude, resume or career question goes to Claude, which remembers the last 10 messages and knows the student's profile and the open jobs. The model is set with `CHATBOT_LLM_MODEL` (default `claude-haiku-5-5`).
- **Rules still handle what the AI can't do:** job recommendation cards (real eligibility and skill matching from your database), skill gaps, the practice-question quiz ("ask me a DBMS question", then "show answer"), and short greetings.
- **Without a key** (or if the AI call fails) it falls back to the original offline rule-based replies, so it never goes down.

## Install
1. Copy this folder into your project, e.g. `backend/chatbot/` (server) and put `client/*` in `frontend/src/components/`.
2. In your Express `server.js`:
   ```js
   const { createChatbotRouter } = require('./chatbot/server/chatbot.routes');
   app.use('/api/chatbot', createChatbotRouter({ Student, Job, authMiddleware }));
   ```
   `authMiddleware` is your existing JWT middleware and must set `req.user.id`.
3. In React (e.g. your student layout):
   ```jsx
   import ChatbotWidget from './components/ChatbotWidget';
   <ChatbotWidget apiUrl="http://localhost:5000" />
   ```
   It reads the JWT from `localStorage.token`; pass `getToken` if you store it elsewhere.

## Expected data (Table 4.1)
- **Student:** `name, branch, cgpa, skills[]`, optional `backlogs`
- **Job:** `title, description, companyId (ref Company with name), deadline, eligibility { minCgpa, branches[], maxBacklogs }`
- Optional but recommended: `requiredSkills: [String]` on Job. If missing, skills are detected from title and description.
- Job card links go to `/jobs/:id`; change this in `ChatbotWidget.jsx` to match your routes.

## Extend it
- Change what the AI covers or how it talks: the `SYSTEM` prompt in `server/llm.js`
- Add quiz questions or topics: `server/knowledgeBase.js`
- Add skills and aliases: `server/skills.js`
- Add an intent: add a pattern in `INTENTS` and a handler in `chatbot.service.js`

## Test
`npm test` (Node 18+, no dependencies).

## Limits
Matching is rule-based (as stated in the report's limitations). The AI sees the last 10 messages, sent by the client with each request; the quiz state is only the last practice question, held by the client. For ML-based ranking later, replace `recommendJobs()` in `jobMatcher.js`; the rest stays the same.
