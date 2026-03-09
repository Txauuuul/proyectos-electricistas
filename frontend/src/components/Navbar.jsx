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
  Zap,
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
    const interval = setInterval(fetchCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token]);

  // Fetch full notifications when dropdown opens
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
  }, [notifOpen, token]);

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
    { path: '/admin/clientes', label: 'Clients', icon: Users },
    { path: '/admin/calendario', label: 'Calendar', icon: Calendar },
    { path: '/admin/electricistas', label: 'Team Stats', icon: BarChart2 },
  ];

  const clientLinks = [
    { path: '/mi-perfil', label: 'My Profile', icon: User },
    { path: '/dashboard', label: 'My Projects', icon: FolderOpen },
    { path: '/mis-clientes', label: 'My Clients', icon: Users },
  ];

  const links = esAdmin ? adminLinks : clientLinks;

  const NavLink = ({ path, label, icon: Icon }) => (
    <button
      onClick={() => { navigate(path); setMobileOpen(false); }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
        isActive(path)
          ? 'bg-blue-600 text-white shadow'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  if (!usuario || !token) return null;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-600 font-bold text-lg"
          >
            <Zap size={24} />
            <span className="hidden sm:inline">ElectriProject</span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-2">
            {links.map(link => (
              <NavLink key={link.path} {...link} />
            ))}
          </div>

          {/* Right side: notifications + user + logout */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              >
                <Bell size={22} />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-3 border-b flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    {notifCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notificaciones.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                    ) : (
                      notificaciones.map(n => (
                        <div
                          key={n._id}
                          className={`px-4 py-3 border-b text-sm cursor-pointer hover:bg-gray-50 transition ${
                            !n.leida ? 'bg-blue-50' : ''
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
            <span className="hidden sm:inline text-sm text-gray-600 font-medium">
              {usuario?.nombre}
            </span>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
          {links.map(link => (
            <NavLink key={link.path} {...link} />
          ))}
        </div>
      )}
    </nav>
  );
}
