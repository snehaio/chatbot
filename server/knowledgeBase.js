// Static placement-prep content. Edit freely: add questions, topics, tips.

const technicalQuestions = {
  dsa: [
    { id: 'dsa-1', q: 'Difference between an array and a linked list?', a: 'Arrays use contiguous memory with O(1) index access but O(n) insert/delete in the middle. Linked lists use nodes with pointers: O(1) insert/delete given the node, but O(n) access.' },
    { id: 'dsa-2', q: 'How does a hash map work and what is a collision?', a: 'A hash function maps a key to a bucket index. A collision is when two keys map to the same bucket; it is handled by chaining (list per bucket) or open addressing. Average get/put is O(1).' },
    { id: 'dsa-3', q: 'When would you use BFS vs DFS?', a: 'BFS (queue) finds shortest paths in unweighted graphs and works level by level. DFS (stack/recursion) suits cycle detection, topological sort and exploring all paths.' },
  ],
  oop: [
    { id: 'oop-1', q: 'Explain the four pillars of OOP.', a: 'Encapsulation (bundle data and methods, hide internals), Abstraction (expose only essentials), Inheritance (reuse via parent-child classes), Polymorphism (same interface, different behaviour: overloading and overriding).' },
    { id: 'oop-2', q: 'Abstract class vs interface?', a: 'An abstract class can hold state and partial implementation and supports single inheritance. An interface defines a contract only (in most languages) and a class can implement many.' },
  ],
  dbms: [
    { id: 'dbms-1', q: 'What are ACID properties?', a: 'Atomicity (all or nothing), Consistency (valid state to valid state), Isolation (concurrent transactions do not interfere), Durability (committed data survives crashes).' },
    { id: 'dbms-2', q: 'Explain normalization and why it is used.', a: 'Organising tables to reduce redundancy and update anomalies: 1NF (atomic values), 2NF (no partial dependency), 3NF (no transitive dependency). Denormalise only for read performance.' },
    { id: 'dbms-3', q: 'SQL vs NoSQL (e.g. MongoDB)?', a: 'SQL: fixed schema, joins, strong ACID, good for relational data. NoSQL document stores: flexible schema, horizontal scaling, good for semi-structured data like resumes and profiles.' },
  ],
  os: [
    { id: 'os-1', q: 'Process vs thread?', a: 'A process has its own address space; a thread is a lightweight unit inside a process that shares memory with sibling threads. Context switching between threads is cheaper.' },
    { id: 'os-2', q: 'What is a deadlock and its four conditions?', a: 'Processes wait on each other forever. Needs mutual exclusion, hold and wait, no preemption and circular wait. Break any one to prevent it.' },
  ],
  cn: [
    { id: 'cn-1', q: 'TCP vs UDP?', a: 'TCP is connection-oriented, reliable and ordered (web, email). UDP is connectionless and faster with no delivery guarantee (video, DNS, gaming).' },
    { id: 'cn-2', q: 'What happens when you type a URL in the browser?', a: 'DNS lookup, TCP handshake (and TLS for HTTPS), HTTP request, server processes and responds, browser parses HTML and renders, loading further resources.' },
  ],
  javascript: [
    { id: 'js-1', q: 'var vs let vs const?', a: 'var is function-scoped and hoisted (initialised as undefined). let and const are block-scoped with a temporal dead zone; const cannot be reassigned.' },
    { id: 'js-2', q: 'Explain closures and the event loop.', a: 'A closure is a function that remembers variables from its defining scope. The event loop pushes callbacks from the task/microtask queues onto the call stack when it is empty, enabling async behaviour on a single thread.' },
  ],
  react: [
    { id: 'react-1', q: 'Why do we use keys in lists?', a: 'Keys give React a stable identity for each element so it can efficiently diff and reorder items without remounting or mixing up state.' },
    { id: 'react-2', q: 'useEffect vs useMemo vs useCallback?', a: 'useEffect runs side effects after render. useMemo caches a computed value; useCallback caches a function reference. Both memo hooks depend on their dependency arrays.' },
  ],
  node: [
    { id: 'node-1', q: 'What is middleware in Express?', a: 'A function (req, res, next) that runs in the request pipeline, e.g. logging, JWT auth or validation. It either ends the response or calls next().' },
    { id: 'node-2', q: 'How does JWT authentication work?', a: 'On login the server signs a token containing claims (user id, role). The client sends it in the Authorization header; the server verifies the signature on each request without storing session state.' },
  ],
  sql: [
    { id: 'sql-1', q: 'WHERE vs HAVING?', a: 'WHERE filters rows before grouping; HAVING filters groups after GROUP BY and can use aggregates like COUNT().' },
    { id: 'sql-2', q: 'INNER JOIN vs LEFT JOIN?', a: 'INNER returns only matching rows from both tables. LEFT returns all rows from the left table plus matches from the right (NULL where none).' },
  ],
  python: [
    { id: 'py-1', q: 'List vs tuple in Python?', a: 'Lists are mutable; tuples are immutable, hashable (if contents are) and slightly faster. Use tuples for fixed records and dict keys.' },
  ],
  java: [
    { id: 'java-1', q: 'Difference between == and .equals() in Java?', a: '== compares references (or primitive values); .equals() compares logical content when overridden, as in String.' },
  ],
};

const topicAliases = {
  dsa: ['dsa', 'data structure', 'data structures', 'algorithm', 'algorithms', 'array', 'linked list', 'graph', 'tree'],
  oop: ['oop', 'oops', 'object oriented', 'object-oriented'],
  dbms: ['dbms', 'database', 'databases', 'normalization', 'acid', 'mongodb'],
  os: ['os', 'operating system', 'operating systems', 'deadlock'],
  cn: ['cn', 'computer network', 'computer networks', 'networking', 'tcp'],
  javascript: ['javascript', 'js', 'es6'],
  react: ['react', 'reactjs'],
  node: ['node', 'nodejs', 'express', 'jwt'],
  sql: ['sql', 'mysql', 'postgres', 'queries'],
  python: ['python'],
  java: ['java'],
};

const hrQuestions = [
  { id: 'hr-1', q: 'Tell me about yourself.', a: 'Use present-past-future in ~60-90 seconds: who you are now (branch, key skills), 1-2 relevant projects or achievements, and why this role excites you. Do not recite your resume.' },
  { id: 'hr-2', q: 'What are your strengths and weaknesses?', a: 'Pick 2 strengths backed by a short example. For a weakness, name a real, non-critical one and show what you are doing to improve it.' },
  { id: 'hr-3', q: 'Why should we hire you?', a: 'Match 2-3 of your skills or projects directly to the job description, and show eagerness to learn and contribute quickly.' },
  { id: 'hr-4', q: 'Where do you see yourself in 5 years?', a: 'Show growth within the field: deepening technical skills, taking ownership, perhaps mentoring. Keep it realistic and aligned with the company.' },
  { id: 'hr-5', q: 'Describe a challenge you faced in a project and how you solved it.', a: 'Use STAR: Situation, Task, Action, Result. Be specific about YOUR contribution and quantify the outcome if you can.' },
  { id: 'hr-6', q: 'Why do you want to join our company?', a: 'Research the company: products, tech stack, values, recent news. Connect one or two of these to your own goals.' },
];

const aptitudeTips = {
  quant: 'Quantitative: revise percentages, profit and loss, ratio, time-speed-distance, time and work, permutations and combinations, and probability. Learn tables to 20 and squares to 30, and practise mental maths. Do timed sets of 15-20 questions.',
  logical: 'Logical reasoning: practise seating arrangements, blood relations, syllogisms, coding-decoding, series and puzzles. Draw diagrams instead of solving in your head, and skip puzzles that eat more than 3 minutes.',
  verbal: 'Verbal: read editorials daily, revise subject-verb agreement, tenses and prepositions, and practise reading comprehension with a timer. For para-jumbles find the opening sentence first.',
  general: 'Aptitude strategy: take a timed mock every 2-3 days, review every wrong answer, keep an error log, and aim for accuracy first and speed second. Most companies have a sectional cutoff, so do not neglect your weakest section.',
};

const resumeTips = [
  'Keep it to one page with a clean single-column layout and a standard font. ATS parsers dislike tables and graphics.',
  'Lead with Education, Skills and Projects if you are a fresher. Put your most relevant items first.',
  'Write achievement bullets: action verb + what you did + measurable result ("Cut API response time by 35% by adding indexes").',
  'List skills that you can defend in an interview, and mirror keywords from the job description.',
  'Add GitHub and LinkedIn links, and make sure they work. Name the file like Firstname_Lastname_Resume.pdf.',
  'Proofread twice. Typos are the quickest way to a rejection.',
];

const roadmaps = {
  default: [
    'Weeks 1-2: Core language (C++/Java/Python) plus arrays, strings, hashing. 2 problems a day.',
    'Weeks 3-4: Linked lists, stacks, queues, recursion, sorting and searching. Start one aptitude set per day.',
    'Weeks 5-6: Trees, graphs, DP basics. Revise OOP, DBMS (SQL queries), OS and CN fundamentals.',
    'Weeks 7-8: Build or polish 2 projects, update your resume, and take a mock test every other day on the portal.',
    'Final week: Mock interviews (HR + technical), company research, revise your error log.',
  ],
};

module.exports = { technicalQuestions, topicAliases, hrQuestions, aptitudeTips, resumeTips, roadmaps };
