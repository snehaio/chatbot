// Chatbot brain: intent detection + response builders.
// Dependencies (database access, LLM) are injected so this file never touches Mongo or the network directly.

const kb = require('./knowledgeBase');
const { extractSkills } = require('./skills');
const { recommendJobs, skillGaps } = require('./jobMatcher');

// ---------- Intent detection ----------
// Each intent: list of [regex, weight]. Highest total wins; ties go to the earlier intent.
const INTENTS = [
  ['greeting', [[/^\s*(hi|hello|hey|hii|namaste|good (morning|afternoon|evening))\b/i, 3]]],
  ['thanks', [[/\b(thanks|thank you|thx|great|awesome)\b/i, 3]]],
  ['help', [[/\b(help|what can you do|how do you work|features|commands)\b/i, 3]]],
  ['show_answer', [[/\b(show|give|tell)( me)?( the)? (answer|solution)\b|^\s*answer\b|\bhow (do|should) i answer\b/i, 4]]],
  ['skill_gap', [[/skill[- ]?gap|\bmissing\b|what (skills )?(should|do) i (learn|need)|improve my skills|\black\b|upskill/i, 4]]],
  ['jobs', [[/\b(jobs?|openings?|vacanc\w+|internships?|opportunit\w+|recommend\w*|suitable|apply|hiring|roles?|positions?)\b/i, 3], [/\bfor me\b|\bmatch\w*\b/i, 1]]],
  ['practice', [[/\b(ask me|quiz me|practice|mock interview|interview question|test me|next question|another question)\b/i, 4], [/\bquestions?\b/i, 2]]],
  ['hr', [[/\b(hr|behavio(u)?ral|tell me about yourself|strengths?|weakness(es)?|soft skills?)\b/i, 3]]],
  ['aptitude', [[/\b(aptitude|quant\w*|logical|reasoning|verbal|cat|maths?)\b/i, 3]]],
  ['resume', [[/\b(resume|cv|ats)\b/i, 4]]],
  ['roadmap', [[/\b(roadmap|study plan|prep(aration)? plan|schedule|timeline|how (do|should) i (prepare|start)|where (do|should) i start)\b/i, 4]]],
  ['mock_test', [[/\b(mock tests?|assessments?|timed test|score)\b/i, 3]]],
  ['technical', [[/\b(technical|coding|programming|dsa|oop|oops|dbms|os|cn|sql|javascript|react|node|python|java)\b/i, 2], [/\b(data structures?|algorithms?|operating systems?|networks?|database)\b/i, 2]]],
];

function scoreIntent(message) {
  let best = { intent: 'fallback', score: 0 };
  for (const [intent, rules] of INTENTS) {
    const score = rules.reduce((sum, [re, w]) => sum + (re.test(message) ? w : 0), 0);
    if (score > best.score) best = { intent, score };
  }
  return best.score >= 2 ? best : { intent: 'fallback', score: best.score };
}

function detectIntent(message) {
  return scoreIntent(message).intent;
}

// When an LLM is available it answers everything EXCEPT the things only the rules can do well:
// portal data cards (jobs, skill gaps), the quiz flow, and tiny canned replies.
// Broad keyword matches ("how do I prepare for DBMS?", "common HR questions") go to the LLM, not to canned text.
const PERSONAL_CUE = /\b(for me|my (profile|skills?|cgpa|branch)|suit(s|able)? me|eligible|am i|can i apply|match(es)? me|recommend\w*)\b/i;
const EXPLICIT_QUIZ = /\b(ask me|quiz me|test me|mock interview|next question|another question|practice (question|session))\b/i;

function routeToRules(intent, text, context = {}) {
  const words = text.trim().split(/\s+/).length;
  switch (intent) {
    case 'greeting': return words <= 6;
    case 'thanks': return words <= 6;
    case 'help': return words <= 8;
    case 'show_answer': return Boolean(context?.lastQuestionId) || words <= 4; // only mid-quiz, or a bare "show answer"
    case 'skill_gap': return PERSONAL_CUE.test(text) || words <= 7;
    case 'jobs': return PERSONAL_CUE.test(text) || words <= 6;
    case 'practice': return EXPLICIT_QUIZ.test(text);
    default: return false; // hr, aptitude, resume, roadmap, mock_test, technical, fallback -> LLM
  }
}

function detectTopic(message) {
  const m = message.toLowerCase();
  for (const [topic, aliases] of Object.entries(kb.topicAliases)) {
    for (const a of aliases) {
      const re = new RegExp(`(?<![a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`);
      if (re.test(m)) return topic;
    }
  }
  return null;
}

// ---------- Helpers ----------
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const allQuestions = () => [...Object.values(kb.technicalQuestions).flat(), ...kb.hrQuestions];
const findQuestion = (id) => allQuestions().find((q) => q.id === id);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const DEFAULT_SUGGESTIONS = ['Recommend jobs for me', 'What skills am I missing?', 'Ask me a technical question', 'Resume tips', 'Make a study plan'];

const reply = (text, extra = {}) => ({ reply: text, suggestions: DEFAULT_SUGGESTIONS, ...extra });

// ---------- Handlers ----------
const handlers = {
  greeting: ({ student }) =>
    reply(`Hi${student?.name ? ` ${student.name.split(' ')[0]}` : ''}! I'm your placement assistant. I can recommend jobs that fit your profile, show your skill gaps, and help you practise aptitude, technical and HR rounds. What would you like to do?`),

  thanks: () => reply("You're welcome! Ask me anything else about your placement prep."),

  help: () =>
    reply('Here is what I can do:\n• Recommend jobs based on your skills, CGPA and branch\n• Show the skills you are missing for open jobs\n• Ask you technical or HR practice questions (try "ask me a DBMS question")\n• Aptitude tips (quant, logical, verbal)\n• Resume tips and a week-by-week study plan'),

  jobs: async ({ message, student, deps }) => {
    if (!student) return reply('I could not load your profile. Please log in again.');
    const jobs = await deps.getOpenJobs();
    if (!jobs.length) return reply('There are no open job postings right now. Check back soon!');

    const extraSkills = extractSkills(message); // "jobs for react and node" widens the search
    const { matches, ineligible } = recommendJobs(student, jobs, { extraSkills, limit: 5 });

    if (!matches.length) {
      const why = ineligible.slice(0, 3).map((i) => `• ${i.job.title}: ${i.reasons.join(', ')}`).join('\n');
      return reply(`I couldn't find open jobs you're currently eligible for.${why ? `\n\nClosest ones:\n${why}` : ''}\n\nTry improving your profile skills or ask "What skills am I missing?"`);
    }
    const top = matches[0];
    const intro = `I found ${matches.length} job${matches.length > 1 ? 's' : ''} that fit your profile. Best match: ${top.job.title}${top.job.company ? ` at ${top.job.company}` : ''} (${top.score}% match).`;
    return reply(intro, {
      jobs: matches.map((m) => ({
        id: String(m.job._id ?? m.job.jobId ?? ''),
        title: m.job.title,
        company: m.job.company || '',
        deadline: m.job.deadline || null,
        score: m.score,
        matchedSkills: m.matched,
        missingSkills: m.missing,
      })),
      suggestions: ['What skills am I missing?', 'Ask me a technical question', 'Resume tips'],
    });
  },

  skill_gap: async ({ student, deps }) => {
    if (!student) return reply('I could not load your profile. Please log in again.');
    const jobs = await deps.getOpenJobs();
    const { allEligible } = recommendJobs(student, jobs, { limit: 100 });
    const gaps = skillGaps(allEligible);
    if (!gaps.length) {
      return reply(student.skills?.length
        ? 'Nice, your skills already cover the open jobs you are eligible for. Keep practising interview questions!'
        : 'Your profile has no skills yet. Add your skills on your profile page and I can compare them with open jobs.');
    }
    const lines = gaps.map((g) => `• ${cap(g.skill)}: required by ${g.jobs} job${g.jobs > 1 ? 's' : ''} you are eligible for`);
    const practisable = gaps.find((g) => kb.technicalQuestions[detectTopic(g.skill)]);
    const tip = practisable ? `\n\nI can quiz you on ${cap(practisable.skill)}: try "ask me a ${practisable.skill} question".` : '\n\nStart with the first one and add it to your profile once you have practised it.';
    return reply(`Skills that would unlock the most jobs for you:\n${lines.join('\n')}${tip}`, {
      suggestions: [...(practisable ? [`Ask me a ${practisable.skill} question`] : []), 'Make a study plan', 'Recommend jobs for me'],
    });
  },

  practice: ({ message, rng }) => {
    const wantsHr = /\bhr\b|behavio(u)?ral/i.test(message);
    const topic = detectTopic(message);
    let pool;
    let label;
    if (wantsHr) { pool = kb.hrQuestions; label = 'HR'; }
    else if (topic && kb.technicalQuestions[topic]) { pool = kb.technicalQuestions[topic]; label = topic.toUpperCase(); }
    else { pool = Object.values(kb.technicalQuestions).flat(); label = 'Technical'; }
    const q = pick(pool, rng);
    return reply(`${label} question:\n\n${q.q}\n\nThink about it, then say "show answer" or "next question".`, {
      context: { lastQuestionId: q.id },
      suggestions: ['Show answer', 'Next question', 'Ask me an HR question'],
    });
  },

  show_answer: ({ context }) => {
    const q = context?.lastQuestionId && findQuestion(context.lastQuestionId);
    if (!q) return reply('Ask me for a practice question first, for example "ask me a DBMS question", and then I can show you the answer.');
    return reply(`Q: ${q.q}\n\nSample answer: ${q.a}`, { suggestions: ['Next question', 'Ask me an HR question', 'Recommend jobs for me'] });
  },

  hr: ({ rng }) => {
    const q = pick(kb.hrQuestions, rng);
    return reply(`HR rounds test communication and fit. Use the STAR method (Situation, Task, Action, Result) for behavioural questions. Try this one:\n\n${q.q}`, {
      context: { lastQuestionId: q.id },
      suggestions: ['Show answer', 'Next question', 'Resume tips'],
    });
  },

  technical: ({ message, rng }) => {
    const topic = detectTopic(message);
    if (!topic) return reply(`I can quiz you on: ${Object.keys(kb.technicalQuestions).map((t) => t.toUpperCase()).join(', ')}. Try "ask me a DSA question".`);
    const q = pick(kb.technicalQuestions[topic], rng);
    return reply(`${topic.toUpperCase()} practice:\n\n${q.q}\n\nSay "show answer" when ready.`, {
      context: { lastQuestionId: q.id },
      suggestions: ['Show answer', 'Next question', 'Recommend jobs for me'],
    });
  },

  aptitude: ({ message }) => {
    const m = message.toLowerCase();
    const key = /quant|maths?/.test(m) ? 'quant' : /logic|reason/.test(m) ? 'logical' : /verbal|english/.test(m) ? 'verbal' : 'general';
    return reply(`${kb.aptitudeTips[key]}\n\nYou can also take a timed mock test from the Assessments section of the portal.`, {
      suggestions: ['Quant tips', 'Logical reasoning tips', 'Verbal tips', 'Make a study plan'],
    });
  },

  resume: () => reply(`Resume checklist:\n${kb.resumeTips.map((t) => `• ${t}`).join('\n')}`, { suggestions: ['Recommend jobs for me', 'Ask me an HR question'] }),

  roadmap: () => reply(`A simple 8-week placement plan:\n${kb.roadmaps.default.map((t) => `• ${t}`).join('\n')}`, { suggestions: ['Aptitude tips', 'Ask me a DSA question', 'Resume tips'] }),

  mock_test: () => reply('Open the Assessments section on the portal to take timed aptitude and technical mock tests. They are auto-scored, so review every wrong answer afterwards. Want tips for a section?', { suggestions: ['Quant tips', 'Logical reasoning tips', 'Verbal tips'] }),

  fallback: () => reply("I'm not sure I understood that. I can help with job recommendations, skill gaps, practice questions, aptitude, resume tips and study plans. Try one of the options below."),
};

// ---------- Public API ----------
/**
 * @param {object} args
 * @param {string} args.message
 * @param {object} [args.context]   echoed back by the client, e.g. { lastQuestionId }
 * @param {Array}  [args.history]   recent turns [{ role: 'user'|'assistant', content }] so the LLM remembers the chat
 * @param {string} args.userId
 * @param {object} args.deps        { getStudent(userId), getOpenJobs(), llmFallback?(message, { history, student, jobs }) }
 * @param {Function} [args.rng]     injectable for tests
 */
async function handleMessage({ message, context = {}, history = [], userId, deps, rng = Math.random }) {
  const text = String(message || '').trim().slice(0, 1000);
  if (!text) return reply('Please type a message.');

  const intent = detectIntent(text);
  const llm = deps.llmFallback;

  // LLM-first mode: anything the special handlers don't own is answered conversationally.
  if (llm && !routeToRules(intent, text, context)) {
    try {
      const [student, jobs] = await Promise.all([
        deps.getStudent(userId).catch(() => null),
        deps.getOpenJobs().catch(() => []),
      ]);
      const answer = await llm(text, { history, student, jobs });
      if (answer) {
        return reply(answer, { intent: 'llm', suggestions: ['Recommend jobs for me', 'What skills am I missing?', 'Ask me a technical question', 'Make a study plan'] });
      }
    } catch (err) {
      console.error('LLM call failed, using rule-based fallback:', err.message);
    }
  }

  // Rule-based path (no API key, LLM error, or a data-driven intent).
  const needsStudent = intent === 'jobs' || intent === 'skill_gap' || intent === 'greeting';
  const student = needsStudent ? await deps.getStudent(userId) : null;
  const out = await handlers[intent]({ message: text, context, student, deps, rng });
  return { ...out, intent };
}

module.exports = { handleMessage, detectIntent, detectTopic };
