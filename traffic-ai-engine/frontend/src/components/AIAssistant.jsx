import React, { useState } from 'react';
import { Bot, X, Send, Activity, ShieldAlert } from 'lucide-react';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'I am your Operational AI Assistant. You can ask me for live intelligence, congestion predictions, or high-risk areas.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', text: input }]);
    const query = input.toLowerCase();
    setInput('');

    setTimeout(() => {
      let reply = 'I am processing your operational request.';
      
      if (query.includes('congested') || query.includes('traffic')) {
        reply = 'The most congested road currently is Highway 101 Northbound with an 85% density score. Traffic flow is heavily impacted.';
      } else if (query.includes('risk') || query.includes('danger')) {
        reply = 'Downtown Intersection #4 is currently flagged as a High Risk Zone due to recent anomaly detections and wet road conditions.';
      } else if (query.includes('ambulance') || query.includes('emergency')) {
        reply = 'There are 2 active emergency units. Unit A is 4 minutes away from the Highway 101 incident via the active Green Corridor.';
      } else if (query.includes('alert') || query.includes('anomaly')) {
        reply = 'There is 1 active critical anomaly: "Unusual stopping pattern detected on North Bridge". Escalating to operators.';
      }

      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    }, 800);
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--ai-neon)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            zIndex: 1000,
            animation: 'pulse 2s infinite'
          }}
        >
          <Bot size={30} />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '350px',
          height: '500px',
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid var(--ai-border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ background: 'linear-gradient(90deg, rgba(17,24,39,1) 0%, rgba(30,41,59,1) 100%)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--ai-neon)' }}>
              <Bot size={20} /> Operational AI Assistant
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ai-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--ai-muted)', marginBottom: '0.2rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  {m.role === 'user' ? 'Operator' : 'AI Intel'}
                </div>
                <div style={{ 
                  background: m.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', 
                  border: `1px solid ${m.role === 'user' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.1)'}`,
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  color: 'var(--ai-text)',
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask for intel..."
              style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ai-border)', color: 'white', padding: '0.75rem', borderRadius: '4px' }}
            />
            <button onClick={handleSend} style={{ background: 'var(--ai-neon)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 1rem', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
