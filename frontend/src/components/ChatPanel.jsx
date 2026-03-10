import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, MessageCircle, Loader2, RefreshCw } from 'lucide-react';

const ROL_COLORS = {
  administrador: 'bg-blue-100 text-blue-900',
  electricista: 'bg-green-100 text-green-900',
};
const ROL_LABELS = { administrador: 'Admin', electricista: 'Elektricien' };

function formatTime(fechaStr) {
  const d = new Date(fechaStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ proyectoId }) {
  const { token, usuario } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const API = import.meta.env.VITE_API_URL;

  const cargarMensajes = useCallback(async (silent = false) => {
    if (!silent) setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API}/chat/${proyectoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMensajes(data);
      } else {
        setError('Berichten konden niet worden geladen');
      }
    } catch {
      setError('Verbindingsfout');
    } finally {
      setCargando(false);
    }
  }, [proyectoId, token, API]);

  useEffect(() => {
    cargarMensajes();
  }, [cargarMensajes]);

  // Do NOT auto-scroll on new messages — user can manually scroll if needed
  // Commenting out the auto-scroll that was causing annoying behavior
  // useEffect(() => {
  //   bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [mensajes]);

  // Poll for new messages every 15s
  useEffect(() => {
    const interval = setInterval(() => cargarMensajes(true), 15000);
    return () => clearInterval(interval);
  }, [cargarMensajes]);

  const enviar = async () => {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/chat/${proyectoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mensaje: msg }),
      });
      if (res.ok) {
        setTexto('');
        await cargarMensajes(true);
        inputRef.current?.focus();
      } else {
        const d = await res.json();
        setError(d.error || d.mensaje || 'Bericht kon niet worden verzonden');
      }
    } catch {
      setError('Verbindingsfout');
    } finally {
      setEnviando(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col" style={{ height: '380px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-600" />
          <span className="font-bold text-gray-900 text-sm">Projectchat</span>
          <span className="text-xs text-gray-400 hidden sm:inline">— Admin ↔ Elektricien</span>
        </div>
        <button
          onClick={() => cargarMensajes(false)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          title="Vernieuwen"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cargando ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={32} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Nog geen berichten</p>
            <p className="text-xs text-gray-300 mt-1">Start hieronder het gesprek</p>
          </div>
        ) : (
          mensajes.map((m) => {
            const isOwn = m.autorId === usuario?.id || m.autorId?._id === usuario?.id;
            return (
              <div key={m._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  {!isOwn && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROL_COLORS[m.rolAutor] || 'bg-gray-100 text-gray-700'}`}>
                        {ROL_LABELS[m.rolAutor] || m.rolAutor}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">{m.nombreAutor}</span>
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm break-words
                    ${isOwn
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    {m.mensaje}
                  </div>
                  <div className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {formatTime(m.fechaCreacion)}
                    {isOwn && !m.leido && <span className="ml-1 text-blue-400">• ongelezen</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t bg-gray-50 rounded-b-xl">
        <textarea
          ref={inputRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="Typ een bericht... (Enter om te verzenden)"
          disabled={enviando}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
          style={{ maxHeight: '80px' }}
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || enviando}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
