import React, { useState, useRef, useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  X, 
  Bot, 
  User 
} from 'lucide-react';

export default function ChatbotOverlay() {
  const { askAssistant } = usePlatform();
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello! I am your AI Agriculture Assistant. I'm connected to the active farm database. Ask me anything about crop yields, soil types, water usage, or yield predictors!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (!collapsed) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, collapsed]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Query assistant and add response
    try {
      const aiResponseText = await askAssistant(text);
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiResponseText
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 2,
        sender: 'ai',
        text: "I couldn't reach the AI Assistant. Please verify your backend server connection."
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // Pre-configured questions
  const samplePrompts = [
    "Highest Yield Crop?",
    "Avg Water Usage?",
    "Best Soil Type?",
    "Key Yield Factors?"
  ];

  return (
    <AnimatePresence initial={false}>
      {collapsed ? (
        <motion.div 
          key="collapsed-bubble"
          className="assistant-panel collapsed"
          onClick={toggleCollapsed}
          title="Open AI Assistant"
          layoutId="chatbotOverlayPanel"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          whileHover={{ scale: 1.1, rotate: 5, boxShadow: '0 0 20px var(--primary-glow)' }}
          whileTap={{ scale: 0.9 }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <MessageSquare size={24} />
        </motion.div>
      ) : (
        <motion.div 
          key="expanded-panel"
          className="assistant-panel"
          layoutId="chatbotOverlayPanel"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        >
          {/* Header */}
          <div className="assistant-header" onClick={toggleCollapsed}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Agri AI Assistant</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }}></span>
                  Online & connected
                </div>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed();
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages box */}
          <div className="assistant-chat">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`chat-bubble ${msg.sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}
                  style={{ display: 'flex', gap: '0.35rem', flexDirection: 'column' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', opacity: 0.6 }}>
                    {msg.sender === 'ai' ? <Bot size={10} /> : <User size={10} />}
                    <span>{msg.sender === 'ai' ? 'AgriBot' : 'User'}</span>
                  </div>
                  
                  {/* Render bold text helper */}
                  <span 
                    style={{ fontSize: '0.8rem' }}
                    dangerouslySetInnerHTML={{
                      __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }}
                  ></span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Quick selection prompts */}
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0.35rem 0.75rem', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--panel-border)', scrollbarWidth: 'none' }}>
            {samplePrompts.map((prompt, idx) => (
              <motion.button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                whileHover={{ scale: 1.05, borderColor: 'var(--primary)', color: 'var(--text-primary)' }}
                whileTap={{ scale: 0.95 }}
                style={{ 
                  flexShrink: 0, 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--panel-border)', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.7rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'color var(--transition-fast), border-color var(--transition-fast)'
                }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>

          {/* Input area */}
          <div className="assistant-input-area">
            <input 
              type="text" 
              className="assistant-input"
              placeholder="Ask a question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <motion.button 
              className="btn btn-primary"
              onClick={() => handleSendMessage()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ width: '38px', height: '34px', padding: '0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={14} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
