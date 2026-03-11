import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('electricista');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  
  const { login, registrar } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      if (isLogin) {
        await login(email, contrasena);
      } else {
        await registrar(nombre, email, contrasena, rol);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12" style={{ background: '#111111' }}>
      <style>{`
        @keyframes loginGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
      `}</style>

      <div
        className="absolute top-20 left-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: 'rgba(41, 172, 227, 0.18)', animation: 'loginGlow 6s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-16 right-10 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'rgba(41, 172, 227, 0.1)', animation: 'loginGlow 8s ease-in-out infinite' }}
      />

      <div
        className="absolute inset-x-0 top-0 h-[38vh] flex items-center justify-center px-4"
      >
        <div
          className="w-full max-w-md rounded-2xl px-6 py-5 text-center"
          style={{
            background: 'rgba(21, 21, 21, 0.82)',
            border: '1px solid rgba(41, 172, 227, 0.18)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 18px 42px rgba(0,0,0,0.35)'
          }}
        >
          <img
            src="/logo-2beit.png"
            alt="2beIT logo"
            className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-lg"
          />
          <p className="text-gray-300 text-sm text-center leading-relaxed">
            Welkom op het elektriciënbeheerportaal.<br />
            Beheer uw projecten, cliënten en offertes.
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <div
          className="rounded-2xl px-8 pt-24 pb-8"
          style={{
            background: 'linear-gradient(180deg, rgba(29,29,29,0.98) 0%, rgba(22,22,22,0.98) 100%)',
            border: '1px solid #2b2b2b',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55)'
          }}
        >
          <div className="mb-6" style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(41, 172, 227, 0.45) 50%, transparent 100%)' }} />

          <h2
            className="text-xs font-bold tracking-widest uppercase mb-1 text-center"
            style={{ color: '#29ace3' }}
          >
            Elektriciënbeheer
          </h2>
          <p className="text-white text-2xl font-extrabold mb-7 text-center">
            {isLogin ? 'Welkom terug' : 'Account aanmaken'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg p-3 flex gap-2 items-start text-sm"
                style={{ background: '#3b0000', border: '1px solid #7f1d1d' }}
              >
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Naam
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-2.5 rounded text-white text-sm font-medium placeholder-gray-500 focus:outline-none transition"
                  style={{
                    background: '#2b2b2b',
                    border: '1px solid #3a3a3a',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#29ace3')}
                  onBlur={e => (e.target.style.borderColor = '#3a3a3a')}
                  placeholder="Volledige naam"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded text-white text-sm font-medium placeholder-gray-500 focus:outline-none transition"
                style={{
                  background: '#2b2b2b',
                  border: '1px solid #3a3a3a',
                }}
                onFocus={e => (e.target.style.borderColor = '#29ace3')}
                onBlur={e => (e.target.style.borderColor = '#3a3a3a')}
                placeholder="uw@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Wachtwoord
              </label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded text-white text-sm font-medium placeholder-gray-500 focus:outline-none transition"
                style={{
                  background: '#2b2b2b',
                  border: '1px solid #3a3a3a',
                }}
                onFocus={e => (e.target.style.borderColor = '#29ace3')}
                onBlur={e => (e.target.style.borderColor = '#3a3a3a')}
                placeholder="••••••••"
              />
              {!isLogin && (
                <p className="text-gray-500 text-xs mt-1">
                  Min. 8 tekens · 1 hoofdletter · 1 cijfer
                </p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Rol
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full px-4 py-2.5 rounded text-white text-sm font-medium focus:outline-none transition"
                  style={{
                    background: '#2b2b2b',
                    border: '1px solid #3a3a3a',
                  }}
                >
                  <option value="electricista">Elektricien</option>
                  <option value="administrador">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 rounded text-white text-xs font-bold tracking-widest uppercase transition mt-2"
              style={{
                background: cargando ? '#1a6a8a' : '#29ace3',
                cursor: cargando ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!cargando) e.target.style.background = '#1d96cb'; }}
              onMouseLeave={e => { if (!cargando) e.target.style.background = '#29ace3'; }}
            >
              {cargando ? 'Verwerken...' : (isLogin ? 'Inloggen' : 'Registreren')}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-gray-500 text-xs">
              {isLogin ? 'Nog geen account? ' : 'Heeft u al een account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="font-bold transition"
                style={{ color: '#29ace3' }}
              >
                {isLogin ? 'Registreren' : 'Inloggen'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
