// Rule-based job matching, in line with the report's "rule-based matching engine" (Sec. 3.1).
// Pure functions: no database access, so they are easy to unit-test.

const { normalizeSkill, extractSkills } = require('./skills');

/**
 * Field names follow Table 4.1 of the project report. Fields the table does not list are optional:
 *   job.requiredSkills[]  - if absent, skills are extracted from title + description
 *   job.eligibility       - { minCgpa, branches[], maxBacklogs }
 *   student.backlogs      - number, defaults to 0
 */
function requiredSkillsOf(job) {
  if (Array.isArray(job.requiredSkills) && job.requiredSkills.length) {
    return [...new Set(job.requiredSkills.map(normalizeSkill))];
  }
  return extractSkills(`${job.title || ''} ${job.description || ''}`);
}

function checkEligibility(student, job, now = new Date()) {
  const reasons = [];
  const e = job.eligibility || {};
  if (job.deadline && new Date(job.deadline) < now) reasons.push('deadline passed');
  if (e.minCgpa != null && (student.cgpa ?? 0) < e.minCgpa) reasons.push(`needs CGPA ${e.minCgpa}+`);
  if (Array.isArray(e.branches) && e.branches.length) {
    const ok = e.branches.some((b) => String(b).toLowerCase() === String(student.branch || '').toLowerCase());
    if (!ok) reasons.push(`open to ${e.branches.join('/')} only`);
  }
  if (e.maxBacklogs != null && (student.backlogs ?? 0) > e.maxBacklogs) {
    reasons.push(`max ${e.maxBacklogs} backlogs allowed`);
  }
  return { eligible: reasons.length === 0, reasons };
}

/**
 * Rank jobs for a student.
 * score (0-100) = 80% skill overlap + 20% CGPA headroom. Jobs with no detectable skills get a neutral 50 skill score.
 * Returns { matches (eligible, sorted), ineligible (with reasons) }.
 */
function recommendJobs(student, jobs, { extraSkills = [], limit = 5, now = new Date() } = {}) {
  const mySkills = new Set([...(student.skills || []), ...extraSkills].map(normalizeSkill));
  const matches = [];
  const ineligible = [];

  for (const job of jobs) {
    const { eligible, reasons } = checkEligibility(student, job, now);
    const required = requiredSkillsOf(job);
    const matched = required.filter((s) => mySkills.has(s));
    const missing = required.filter((s) => !mySkills.has(s));

    if (!eligible) {
      ineligible.push({ job, reasons });
      continue;
    }

    const skillScore = required.length ? matched.length / required.length : 0.5;
    const minCgpa = job.eligibility?.minCgpa ?? 0;
    const headroom = Math.max(0, Math.min(1, ((student.cgpa ?? 0) - minCgpa) / 2));
    const score = Math.round((skillScore * 0.8 + headroom * 0.2) * 100);

    matches.push({ job, score, matched, missing });
  }

  matches.sort((a, b) => b.score - a.score || String(a.job.title).localeCompare(String(b.job.title)));
  return { matches: matches.slice(0, limit), allEligible: matches, ineligible };
}

/** Skills most often missing across the jobs the student is eligible for. */
function skillGaps(allEligible, topN = 5) {
  const count = new Map();
  for (const m of allEligible) for (const s of m.missing) count.set(s, (count.get(s) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([skill, jobs]) => ({ skill, jobs }));
}

module.exports = { recommendJobs, skillGaps, checkEligibility, requiredSkillsOf };
