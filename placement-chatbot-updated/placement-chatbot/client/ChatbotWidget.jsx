import { useEffect, useRef, useState } from 'react';
import './ChatbotWidget.css';

// Drop <ChatbotWidget /> into your student layout, e.g. inside App.jsx or StudentDashboard.jsx.
// Props:
//   apiUrl   - base URL of your backend (default: same origin)
//   getToken - returns the JWT; default reads localStorage "token"

// Tiny, safe markdown renderer: code fences, bullet/numbered lists, **bold**, `inline code`. Never injects raw HTML.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function RichText({ text }) {
  const blocks = String(text).split(/```[a-zA-Z0-9+#-]*\n?/);
  return blocks.map((block, bi) => {
    if (bi % 2 === 1) return <pre key={bi}><code>{block.replace(/\n$/, '')}</code></pre>;
    const out = [];
    let list = null;
    block.split('\n').forEach((line, li) => {
      const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
      if (m) {
        const ordered = /^\s*\d/.test(line);
        if (!list || list.ordered !== ordered) { list = { ordered, items: [] }; out.push(list); }
        list.items.push(m[1]);
      } else {
        list = null;
        if (line.trim()) out.push(<p key={`${bi}-${li}`}>{inline(line)}</p>);
      }
    });
    return out.map((o, oi) => {
      if (!o.items) return o;
      const Tag = o.ordered ? 'ol' : 'ul';
      return <Tag key={`${bi}-l${oi}`}>{o.items.map((it, ii) => <li key={ii}>{inline(it)}</li>)}</Tag>;
    });
  });
}

export default function ChatbotWidget({
  apiUrl = '',
  getToken = () => localStorage.getItem('token'),
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState({});
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: "Hi! I'm your placement assistant. Ask me anything about placements, interviews, coding, aptitude, resumes or careers, or ask for job recommendations and skill gaps.",
      suggestions: ['Recommend jobs for me', 'What skills am I missing?', 'How do I crack a TCS interview?', 'Explain normalization in DBMS'],
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput('');
    // Last 10 turns go to the server so the AI remembers the conversation.
    const history = messages.slice(-10).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }));
    setMessages((m) => [...m, { from: 'user', text: message }]);
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/chatbot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message, context, history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContext(data.context || {});
      setMessages((m) => [...m, { from: 'bot', text: data.reply, jobs: data.jobs, suggestions: data.suggestions }]);
    } catch {
      setMessages((m) => [...m, { from: 'bot', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  const last = messages[messages.length - 1];

  return (
    <>
      <button className="cb-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Open placement assistant'}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <section className="cb-panel" role="dialog" aria-label="Placement assistant">
          <header className="cb-header">Placement Assistant</header>

          <div className="cb-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`cb-msg cb-${m.from}`}>
                <RichText text={m.text} />
                {m.jobs?.map((j) => (
                  <div key={j.id || j.title} className="cb-job">
                    <div className="cb-job-top">
                      <strong>{j.title}</strong>
                      <span className="cb-score">{j.score}%</span>
                    </div>
                    {j.company && <div className="cb-muted">{j.company}</div>}
                    {j.deadline && <div className="cb-muted">Apply by {new Date(j.deadline).toLocaleDateString()}</div>}
                    {j.matchedSkills?.length > 0 && <div className="cb-tags">{j.matchedSkills.map((s) => <span key={s} className="cb-tag ok">{s}</span>)}</div>}
                    {j.missingSkills?.length > 0 && <div className="cb-tags">{j.missingSkills.map((s) => <span key={s} className="cb-tag miss">{s}</span>)}</div>}
                    {j.id && <a className="cb-link" href={`/jobs/${j.id}`}>View job</a>}
                  </div>
                ))}
              </div>
            ))}
            {loading && <div className="cb-msg cb-bot cb-typing">Typing…</div>}
            <div ref={endRef} />
          </div>

          {last?.from === 'bot' && last.suggestions?.length > 0 && !loading && (
            <div className="cb-chips">
              {last.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <form className="cb-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about placements…" maxLength={1000} aria-label="Message" />
            <button type="submit" disabled={loading || !input.trim()}>Send</button>
          </form>
        </section>
      )}
    </>
  );
}
