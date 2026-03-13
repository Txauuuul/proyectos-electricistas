import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  Calendar,
  BarChart2,
} from 'lucide-react';

export default function Navbar() {
  const { usuario, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notification state
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const notifRef = useRef(null);

  const API = import.meta.env.VITE_API_URL;
  const esAdmin = usuario?.rol === 'administrador';

  // Fetch notification count
  useEffect(() => {
    if (!token) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API}/notificaciones/no-leidas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifCount(data.count || 0);
        }
      } catch (e) { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [token]);

  // Fetch full notifications when dropdown opens or when count changes while open
  useEffect(() => {
    if (!notifOpen || !token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/notificaciones`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotificaciones(data);
        }
      } catch (e) { /* ignore */ }
    })();
  }, [notifOpen, notifCount, token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notificaciones/leer-todas`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifCount(0);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (e) { /* ignore */ }
  };

  const markOneRead = async (id) => {
    try {
      await fetch(`${API}/notificaciones/${id}/leer`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifCount(prev => Math.max(0, prev - 1));
      setNotificaciones(prev => prev.map(n => n._id === id ? { ...n, leida: true } : n));
    } catch (e) { /* ignore */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const adminLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/clientes', label: 'Klanten', icon: Users },
    { path: '/admin/calendario', label: 'Kalender', icon: Calendar },
    { path: '/admin/electricistas', label: 'Teamstatistieken', icon: BarChart2 },
  ];

  const clientLinks = [
    { path: '/mi-perfil', label: 'Mijn profiel', icon: User },
    { path: '/dashboard', label: 'Mijn projecten', icon: FolderOpen },
    { path: '/mis-clientes', label: 'Mijn klanten', icon: Users },
  ];

  const links = esAdmin ? adminLinks : clientLinks;

  const NavLink = ({ path, label }) => (
    <button
      onClick={() => { navigate(path); setMobileOpen(false); }}
      className={`
        relative px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors duration-200
        ${isActive(path)
          ? 'text-[#29ace3]'
          : 'text-white hover:text-[#29ace3]'
        }
      `}
    >
      {label}
      {isActive(path) && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#29ace3] rounded-full" />
      )}
    </button>
  );

  if (!usuario || !token) return null;

  return (
    <nav className="sticky top-0 z-40" style={{ background: '#1a1a1a' }}>
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex items-center justify-between h-[52px] sm:h-[64px]">

          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 flex-shrink-0"
          >
            <img
              src="/logo-2beit.png"
              alt="2beIT"
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded"
            />
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <NavLink key={link.path} path={link.path} label={link.label} />
            ))}
          </div>

          {/* Right: bell + user + logout */}
          <div className="flex items-center gap-2">

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded text-gray-300 hover:text-[#29ace3] transition-colors"
              >
                <Bell size={20} />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#29ace3] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-12 w-[calc(100vw-1rem)] max-w-sm sm:w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-3 border-b flex justify-between items-center bg-[#1a1a1a]">
                    <span className="font-bold text-white text-sm tracking-wide">MELDINGEN</span>
                    {notifCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-[#29ace3] hover:underline font-semibold"
                      >
                        Alles gelezen
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notificaciones.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">Geen meldingen</p>
                    ) : (
                      notificaciones.map(n => (
                        <div
                          key={n._id}
                          className={`px-4 py-3 border-b text-sm cursor-pointer hover:bg-gray-50 transition ${
                            !n.leida ? 'bg-blue-50 border-l-2 border-l-[#29ace3]' : ''
                          }`}
                          onClick={() => {
                            if (!n.leida) markOneRead(n._id);
                            if (n.proyectoId) {
                              navigate(`/proyecto/${n.proyectoId._id || n.proyectoId}`);
                              setNotifOpen(false);
                            }
                          }}
                        >
                          <p className="font-semibold text-gray-900">{n.titulo}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{n.mensaje}</p>
                          <p className="text-gray-400 text-[10px] mt-1">
                            {new Date(n.fechaCreacion).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User name */}
            <span className="hidden sm:inline text-xs text-gray-400 font-semibold tracking-wide uppercase">
              {usuario?.nombre}
            </span>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded text-gray-300 hover:text-red-400 transition-colors"
              title="Uitloggen"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded text-gray-300 hover:text-[#29ace3] transition-colors"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{ background: '#2b2b2b', borderColor: '#333' }}
        >
          {links.map(link => (
            <button
              key={link.path}
              onClick={() => { navigate(link.path); setMobileOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded text-xs font-bold tracking-widest uppercase transition-colors ${
                isActive(link.path)
                  ? 'text-[#29ace3] bg-white/5'
                  : 'text-gray-300 hover:text-[#29ace3] hover:bg-white/5'
              }`}
            >
              <link.icon size={16} />
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
