// Express wiring. Usage in your existing server.js:
//
//   const { createChatbotRouter } = require('./chatbot/server/chatbot.routes');
//   app.use('/api/chatbot', createChatbotRouter({ Student, Job, authMiddleware }));
//
// - Student / Job: your Mongoose models (fields per Table 4.1 of the report).
// - authMiddleware: your existing JWT middleware; it must set req.user.id.

const express = require('express');
const { handleMessage } = require('./chatbot.service');
const { createLlmFallback } = require('./llm');

function createChatbotRouter({ Student, Job, authMiddleware }) {
  const router = express.Router();
  const llmFallback = createLlmFallback();

  const deps = {
    getStudent: (userId) => Student.findById(userId).lean(),

    // Open jobs only, with the company name flattened onto the job for display.
    getOpenJobs: async () => {
      const jobs = await Job.find({ $or: [{ deadline: { $gte: new Date() } }, { deadline: null }] })
        .populate('companyId', 'name')
        .lean();
      return jobs.map((j) => ({ ...j, company: j.companyId?.name || '' }));
    },
    llmFallback: llmFallback || undefined,
  };

  router.post('/message', authMiddleware, async (req, res) => {
    try {
      const { message, context, history } = req.body || {};
      if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
      }
      const result = await handleMessage({ message, context, history, userId: req.user.id, deps });
      res.json(result);
    } catch (err) {
      console.error('Chatbot error:', err);
      res.status(500).json({ error: 'Chatbot is unavailable right now.' });
    }
  });

  return router;
}

module.exports = { createChatbotRouter };
