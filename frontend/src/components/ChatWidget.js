import { warn } from '@/lib/logger';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MessageCircle, X, Send, Loader2, Phone, KeyRound, Paperclip, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SESSION_KEY = 'terracito.chat_session';
const HISTORY_KEY = 'terracito.chat_history';
const BOOKING_KEY = 'terracito.chat_booking_code';

const QUICK_PROMPTS = {
  it: [
    { label: 'Check-in', text: 'A che ora posso fare il check-in?' },
    { label: 'Wi-Fi', text: 'Qual è la rete Wi-Fi della casa?' },
    { label: 'Indirizzo', text: 'Qual è l\u2019indirizzo esatto?' },
    { label: 'Parcheggio', text: 'Dove posso parcheggiare?' }
  ],
  en: [
    { label: 'Check-in', text: 'What time can I check in?' },
    { label: 'Wi-Fi', text: 'What is the Wi-Fi name?' },
    { label: 'Address', text: 'What is the exact address?' },
    { label: 'Parking', text: 'Where can I park?' }
  ]
};

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random()}`);

// Turn any /prenota/... or absolute URL embedded in the assistant reply into a
// clickable link. Keeps the rest of the text as-is (no markdown needed).
const URL_RX = /(\/prenota\/[A-Za-z0-9_\-/?=&%.]+|https?:\/\/[^\s)]+)/g;
const renderMessageContent = (text) => {
  if (!text) return null;
  const parts = String(text).split(URL_RX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={`lnk-${i}`}
          href={part}
          target={part.startsWith('/') ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium hover:opacity-80"
          data-testid="chat-inline-link"
        >
          {part}
        </a>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
};

const getSessionId = () => {  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) { id = newId(); localStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch (e) {
    warn('ChatWidget: localStorage unavailable for session id', e);
    return newId();
  }
};

const getInitialHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    warn('ChatWidget: failed to read cached history', e);
  }
  return [];
};

export const ChatWidget = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'it').startsWith('en') ? 'en' : 'it';
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(getInitialHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [bookingCode, setBookingCode] = useState(() => {
    try { return localStorage.getItem(BOOKING_KEY) || ''; } catch (e) {
      warn('ChatWidget: failed to read booking code', e);
      return '';
    }
  });
  const [showCodeField, setShowCodeField] = useState(false);
  const sessionId = useMemo(() => getSessionId(), []);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Auto-detect property slug from current route /property/:slug
  const propertySlug = useMemo(() => {
    const m = location.pathname.match(/^\/property\/([^/]+)/);
    return m ? m[1] : null;
  }, [location.pathname]);

  // The chat is property-scoped: only render on a property detail page.
  // Visitors on the homepage / catalog / booking / admin won't see the widget.
  const isOnPropertyPage = Boolean(propertySlug);

  // Persist conversation locally
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50))); } catch (e) {
      warn('ChatWidget: failed to persist history', e);
    }
  }, [messages]);

  // Persist booking code
  useEffect(() => {
    try {
      if (bookingCode) localStorage.setItem(BOOKING_KEY, bookingCode);
      else localStorage.removeItem(BOOKING_KEY);
    } catch (e) {
      warn('ChatWidget: failed to persist booking code', e);
    }
  }, [bookingCode]);

  // Auto-scroll on new message / open
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length, sending]);

  // Focus input when opening + lock body scroll on mobile so the chat doesn't
  // bounce under the background page when the keyboard opens / closes.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(t);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open]);

  const t = (it, en) => (lang === 'it' ? it : en);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || sending) return;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed, ts: new Date().toISOString() }]);
    setInput('');
    setSending(true);
    try {
      const res = await axios.post(`${API}/chat/message`, {
        message: trimmed,
        session_id: sessionId,
        property_id: propertySlug || null,
        language: lang,
        booking_code: bookingCode || null
      });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: res.data.reply,
        needs_host_contact: res.data.needs_host_contact,
        whatsapp_number: res.data.whatsapp_number,
        images: res.data.images || [],
        ts: new Date().toISOString()
      }]);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: t(`Mi dispiace, problema momentaneo: ${detail}. Riprova tra poco.`, `Sorry, temporary issue: ${detail}. Please try again shortly.`),
        ts: new Date().toISOString(),
        is_error: true
      }]);
    } finally {
      setSending(false);
    }
  }, [sending, sessionId, propertySlug, lang, bookingCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const resetConversation = () => {
    setMessages([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.setItem(SESSION_KEY, newId()); // fresh session id
    } catch (e) {
      warn('ChatWidget: failed to reset conversation storage', e);
    }
    window.location.reload(); // simplest way to refresh sessionId
  };

  // Onboarding tooltip — shows once per session ~3s after mount, until user clicks the launcher
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('terracito.chat_tip_dismissed') === '1'; } catch (e) {
      warn('ChatWidget: failed to read tooltip flag', e);
    }
    if (dismissed || open || messages.length > 0) return;
    const t1 = setTimeout(() => setShowTip(true), 2500);
    const t2 = setTimeout(() => {
      setShowTip(false);
      try { sessionStorage.setItem('terracito.chat_tip_dismissed', '1'); } catch (e) {
        warn('ChatWidget: failed to dismiss tooltip flag', e);
      }
    }, 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open, messages.length]);

  const handleLauncherClick = () => {
    setShowTip(false);
    try { sessionStorage.setItem('terracito.chat_tip_dismissed', '1'); } catch (e) {
      warn('ChatWidget: failed to persist tooltip dismiss', e);
    }
    setOpen((o) => !o);
  };

  const handleFilePick = () => {
    if (uploading || sending) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file later
    if (!file) return;

    // Client-side checks mirror the backend ones
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!ok.includes(file.type)) {
      setMessages((prev) => [...prev, {
        role: 'assistant', is_error: true, ts: new Date().toISOString(),
        content: t(
          `Formato non supportato. Carica JPG, PNG, WEBP, HEIC o PDF.`,
          `Unsupported format. Please upload JPG, PNG, WEBP, HEIC or PDF.`
        )
      }]);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessages((prev) => [...prev, {
        role: 'assistant', is_error: true, ts: new Date().toISOString(),
        content: t('Il file è troppo grande (max 10 MB).', 'File too large (max 10 MB).')
      }]);
      return;
    }

    // Optimistic bubble
    setMessages((prev) => [...prev, {
      role: 'user',
      ts: new Date().toISOString(),
      attachment_filename: file.name,
      attachment_type: file.type,
      attachment_pending: true,
      content: t(`Invio documento: ${file.name}\u2026`, `Uploading: ${file.name}\u2026`)
    }]);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('session_id', sessionId);
      fd.append('file', file);
      if (propertySlug) fd.append('property_id', propertySlug);
      const res = await axios.post(`${API}/chat/upload-document`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessages((prev) => {
        const copy = [...prev];
        // replace the last pending bubble
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].attachment_pending) {
            copy[i] = {
              role: 'user',
              ts: copy[i].ts,
              attachment_filename: res.data.filename,
              attachment_type: file.type,
              attachment_id: res.data.id,
              content: t(`📎 Documento inviato: ${res.data.filename}`, `📎 Document sent: ${res.data.filename}`)
            };
            break;
          }
        }
        // Add a system-like confirmation from the host
        copy.push({
          role: 'assistant',
          ts: new Date().toISOString(),
          content: t(
            'Grazie, ho ricevuto il documento 👍 Lo faccio controllare e ti ricontatto appena possibile.',
            'Thanks, I got the document 👍 I\u2019ll review it and get back to you shortly.'
          )
        });
        return copy;
      });
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setMessages((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].attachment_pending) {
            copy[i] = {
              role: 'assistant',
              is_error: true,
              ts: copy[i].ts,
              content: t(`Errore upload: ${detail}`, `Upload error: ${detail}`)
            };
            break;
          }
        }
        return copy;
      });
    } finally {
      setUploading(false);
    }
  };

  const cleanWhatsappNumber = (n) => (n || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  const fallbackWa = '393445361830';

  // Hide the widget entirely outside a property detail page.
  if (!isOnPropertyPage) return null;

  return (
    <>
      {/* Onboarding tooltip — points to the launcher */}
      <div
        className={`fixed z-[51] bottom-36 sm:bottom-40 right-5 sm:right-6 max-w-[260px] transition-all duration-500 ${showTip && !open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
        data-testid="chat-tooltip"
      >
        <div className="relative bg-foreground text-background px-4 py-3 shadow-xl">
          <p className="text-sm leading-snug">
            {t('Ciao 👋 Hai una domanda? Sono qui per te 24/7.', 'Hi 👋 Got a question? I\u2019m here for you 24/7.')}
          </p>
          <span className="absolute -bottom-1.5 right-8 w-3 h-3 bg-foreground rotate-45" />
        </div>
      </div>

      {/* Floating launcher — large, animated, attention-grabbing */}
      <button
        type="button"
        onClick={handleLauncherClick}
        className={`group fixed z-50 bottom-20 right-5 sm:bottom-24 sm:right-6 inline-flex items-center gap-2.5 pl-4 pr-5 py-3.5 bg-primary text-primary-foreground shadow-2xl hover:bg-[hsl(var(--terracotta-deep))] hover:scale-105 transition-all ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
        aria-label={t('Apri assistenza chat', 'Open help chat')}
        data-testid="chat-launcher"
        style={{ boxShadow: '0 12px 36px -8px hsl(var(--terracotta) / 0.6)' }}
      >
        <span className="relative">
          <MessageCircle className="w-6 h-6" />
          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 ${showTip ? 'animate-ping' : ''}`} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400" />
        </span>
        <span className="text-sm font-semibold tracking-wide">{t('Assistenza', 'Help')}</span>
      </button>

      {/* Chat panel — fills the visible viewport on mobile, floats on desktop.
          - `100dvh` adapts to iOS Safari address bar visibility (100vh would clip).
          - `pb-[env(safe-area-inset-bottom)]` handles iPhone home indicator.
          - `inset-x-0 top-0` + explicit height avoid the `inset-0` → height:100% trap. */}
      <div
        role="dialog"
        aria-hidden={!open}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        className={`fixed z-50 inset-x-0 top-0 h-[100dvh] max-h-[100dvh] sm:inset-auto sm:top-auto sm:bottom-24 sm:right-5 sm:w-[400px] sm:h-[640px] sm:max-h-[80vh] flex flex-col bg-card border border-border shadow-2xl transition-all duration-300 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        data-testid="chat-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <div className="w-9 h-9 bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">TerracitoAppartments</p>
              <p className="text-[11px] opacity-85">{t('Assistente virtuale 24/7', 'Virtual assistant 24/7')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowCodeField((v) => !v)}
              className="p-2 hover:bg-white/15 transition-colors"
              title={t('Sblocca info riservate con codice prenotazione', 'Unlock with booking code')}
              data-testid="chat-toggle-booking"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-white/15 transition-colors"
              data-testid="chat-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Booking code panel */}
        {showCodeField && (
          <div className="px-4 py-3 bg-muted border-b border-border/60">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
              {t('Codice prenotazione (sblocca Wi-Fi password e indirizzo esatto)', 'Booking code (unlocks Wi-Fi password and exact address)')}
            </label>
            <div className="flex gap-2">
              <input
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
                placeholder="b3f24a1c-..."
                className="flex-1 bg-card border border-border px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
                data-testid="chat-booking-input"
              />
              {bookingCode && (
                <button onClick={() => setBookingCode('')} className="text-xs px-3 text-muted-foreground hover:text-foreground">
                  {t('Cancella', 'Clear')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[hsl(var(--background))]">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-3" data-testid="chat-empty-state">
              <div className="w-12 h-12 mx-auto bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  'Ciao! Sono l\u2019assistente virtuale. Posso aiutarti per verificare la disponibilità, darti i prezzi e procedere con la prenotazione. Inoltre ti darò tutte le info necessarie per quanto riguarda il check-in, Wi-Fi, parcheggio, indirizzo e altro.',
                  'Hi! I\u2019m the virtual assistant. I can help you check availability, give prices, and complete your booking. I can also provide all the info you need about check-in, Wi-Fi, parking, address and more.'
                )}
              </p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={m.ts ? `${m.ts}-${m.role}` : `msg-${idx}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`chat-msg-${m.role}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : m.is_error
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-card border border-border text-foreground'
                }`}
              >
                {renderMessageContent(m.content)}
                {m.attachment_filename && !m.attachment_pending && (
                  <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1.5 bg-background/30 border border-border/40 text-xs">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[180px]">{m.attachment_filename}</span>
                  </div>
                )}
                {m.role === 'assistant' && Array.isArray(m.images) && m.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5" data-testid="chat-images-grid">
                    {m.images.map((img, i) => (
                      <a
                        key={`${img.url}-${i}`}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-sm border border-border/50 hover:opacity-90 transition-opacity"
                        data-testid={`chat-image-${i}`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt || 'casa'}
                          loading="lazy"
                          className="w-full h-24 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && m.needs_host_contact && (
                  <a
                    href={`tel:${cleanWhatsappNumber(m.whatsapp_number) || fallbackWa}`}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs uppercase tracking-wider hover:bg-[hsl(var(--terracotta-deep))]"
                    data-testid="chat-call-host"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {t(`Chiama l\u2019host: ${m.whatsapp_number || '+39 344 5361830'}`, `Call the host: ${m.whatsapp_number || '+39 344 5361830'}`)}
                  </a>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start" data-testid="chat-typing">
              <div className="bg-card border border-border px-4 py-3 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts (only when empty) */}
        {messages.length === 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2" data-testid="chat-quick-prompts">
            {QUICK_PROMPTS[lang].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => sendMessage(p.text)}
                className="text-xs px-3 py-1.5 bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                data-testid={`chat-prompt-${p.label.toLowerCase()}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="border-t border-border/60 p-3 flex items-center gap-2 bg-card">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={resetConversation}
              className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-2"
              title={t('Nuova conversazione', 'New conversation')}
              data-testid="chat-reset"
            >
              {t('Nuova', 'New')}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={handleFileSelected}
            data-testid="chat-file-input"
          />
          <button
            type="button"
            onClick={handleFilePick}
            disabled={uploading || sending}
            title={t('Allega documento', 'Attach document')}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50 p-2 transition-colors"
            data-testid="chat-attach-btn"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('Scrivi un messaggio\u2026', 'Type a message\u2026')}
            disabled={sending}
            maxLength={2000}
            className="flex-1 bg-transparent border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-primary text-primary-foreground p-2.5 hover:bg-[hsl(var(--terracotta-deep))] disabled:opacity-50 transition-colors"
            data-testid="chat-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatWidget;
