// Skill vocabulary + helpers shared by the matcher and the chatbot.

// canonical skill -> aliases (all lowercase)
const SKILLS = {
  javascript: ['javascript', 'js', 'es6'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'reactjs', 'react.js'],
  node: ['node', 'nodejs', 'node.js'],
  express: ['express', 'expressjs', 'express.js'],
  mongodb: ['mongodb', 'mongo', 'mongoose'],
  html: ['html', 'html5'],
  css: ['css', 'css3', 'tailwind', 'bootstrap'],
  python: ['python'],
  java: ['java'],
  cpp: ['c++', 'cpp'],
  c: ['c'],
  sql: ['sql', 'mysql', 'postgres', 'postgresql'],
  dsa: ['dsa', 'data structures', 'algorithms'],
  git: ['git', 'github'],
  docker: ['docker'],
  aws: ['aws'],
  'machine learning': ['machine learning', 'ml'],
  'data analysis': ['data analysis', 'pandas', 'excel', 'power bi', 'tableau'],
  django: ['django'],
  flask: ['flask'],
  spring: ['spring', 'spring boot'],
  android: ['android', 'kotlin'],
  testing: ['testing', 'jest', 'mocha', 'selenium', 'qa'],
  'rest api': ['rest', 'rest api', 'restful', 'api'],
};

const aliasToCanonical = new Map();
for (const [canon, aliases] of Object.entries(SKILLS)) {
  aliasToCanonical.set(canon, canon);
  for (const a of aliases) aliasToCanonical.set(a, canon);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-compile one regex per alias. Lookarounds instead of \b so "c++" and "node.js" work.
const aliasRegexes = [...aliasToCanonical.keys()].map((alias) => ({
  alias,
  canon: aliasToCanonical.get(alias),
  // "." in the lookbehind stops "node.js" from also matching the alias "js".
  re: new RegExp(`(?<![a-z0-9+#.])${escapeRegExp(alias)}(?![a-z0-9+#])`, 'i'),
}));

/** Canonicalise one skill tag ("ReactJS" -> "react"). Unknown tags are lower-cased and kept. */
function normalizeSkill(tag) {
  const t = String(tag || '').trim().toLowerCase();
  return aliasToCanonical.get(t) || t;
}

/** Find known skills mentioned in free text. */
function extractSkills(text) {
  const found = new Set();
  const s = String(text || '');
  for (const { canon, re } of aliasRegexes) if (re.test(s)) found.add(canon);
  // Single-letter "c" and generic "api" are noisy in prose; only keep them if clearly intended.
  if (found.has('c') && !/\b(c language|in c|c programming|\bc\b\s*,|, c\b)/i.test(s)) found.delete('c');
  return [...found];
}

module.exports = { SKILLS, normalizeSkill, extractSkills };
