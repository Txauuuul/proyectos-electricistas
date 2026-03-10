import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Trash2, Edit2, X, Search, User, Phone, Mail, MapPin, FileText,
} from 'lucide-react';

export default function MyClients() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [form, setForm] = useState({
    nombre: '', apellidos: '', empresa: '', direccion: '',
    codigoPostal: '', ciudad: '', telefono: '', email: '', notas: '',
  });
  const [guardando, setGuardando] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    cargarClientes();
  }, [token]);

  const cargarClientes = async () => {
    try {
      const res = await fetch(`${API}/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClientes(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => {
    setForm({ nombre: '', apellidos: '', empresa: '', direccion: '', codigoPostal: '', ciudad: '', telefono: '', email: '', notas: '' });
    setEditando(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setForm({
      nombre: c.nombre || '', apellidos: c.apellidos || '', empresa: c.empresa || '',
      direccion: c.direccion || '', codigoPostal: c.codigoPostal || '', ciudad: c.ciudad || '',
      telefono: c.telefono || '', email: c.email || '', notas: c.notas || '',
    });
    setEditando(c._id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { alert('Name is required'); return; }
    setGuardando(true);
    try {
      const url = editando ? `${API}/clientes/${editando}` : `${API}/clientes`;
      const method = editando ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModalOpen(false);
      resetForm();
      await cargarClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client? Projects associated will not be deleted.')) return;
    try {
      const res = await fetch(`${API}/clientes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error');
      setClientes(prev => prev.filter(c => c._id !== id));
      if (clienteDetalle?._id === id) setClienteDetalle(null);
    } catch (err) {
      alert('Error deleting client');
    }
  };

  const verDetalle = async (id) => {
    try {
      const res = await fetch(`${API}/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClienteDetalle(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    return (c.nombre || '').toLowerCase().includes(q) ||
      (c.apellidos || '').toLowerCase().includes(q) ||
      (c.empresa || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
          <p className="text-gray-600">Manage the end-customers for your projects.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
          <div className="relative min-w-[280px]">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, company or email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
          >
            <Plus size={18} /> New Client
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Client overview</p>
          <p className="text-sm text-gray-500">
            {filtrados.length} client{filtrados.length !== 1 ? 's' : ''} shown
            {busqueda ? ` for “${busqueda}”` : ''}
          </p>
        </div>
        {clienteDetalle && (
          <button
            onClick={() => setClienteDetalle(null)}
            className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl self-start md:self-auto"
          >
            Clear selected client
          </button>
        )}
      </div>

      {clienteDetalle && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-2xl mb-2">
                {clienteDetalle.cliente?.nombre || clienteDetalle.nombre} {clienteDetalle.cliente?.apellidos || clienteDetalle.apellidos || ''}
              </h2>
              <p className="text-sm text-gray-500">
                {(clienteDetalle.cliente?.empresa || clienteDetalle.empresa) || 'Private client'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => openEdit(clienteDetalle.cliente || clienteDetalle)}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-semibold text-sm"
              >
                Edit client
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm mb-6">
            {(clienteDetalle.cliente?.telefono || clienteDetalle.telefono) && (
              <InfoRow icon={Phone} label="Phone" value={clienteDetalle.cliente?.telefono || clienteDetalle.telefono} />
            )}
            {(clienteDetalle.cliente?.email || clienteDetalle.email) && (
              <InfoRow icon={Mail} label="Email" value={clienteDetalle.cliente?.email || clienteDetalle.email} />
            )}
            {(clienteDetalle.cliente?.direccion || clienteDetalle.direccion) && (
              <InfoRow icon={MapPin} label="Address" value={clienteDetalle.cliente?.direccion || clienteDetalle.direccion} />
            )}
            {(clienteDetalle.cliente?.ciudad || clienteDetalle.ciudad) && (
              <InfoRow icon={MapPin} label="City" value={clienteDetalle.cliente?.ciudad || clienteDetalle.ciudad} />
            )}
          </div>

          {clienteDetalle.proyectos && clienteDetalle.proyectos.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={16} /> Projects ({clienteDetalle.proyectos.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {clienteDetalle.proyectos.map(p => (
                  <button
                    key={p._id}
                    onClick={() => navigate(`/proyecto/${p._id}`)}
                    className="text-left p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition text-sm border border-transparent hover:border-blue-200"
                  >
                    <p className="font-semibold text-gray-900 mb-1">{p.tituloAutomatico || p.nombreCasa}</p>
                    <p className="text-gray-500 text-xs">{p.estado} • {new Date(p.fechaInicio).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        {cargando ? (
          <p className="text-gray-500 py-12 text-center">Loading...</p>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {busqueda ? 'No clients match your search' : 'No clients yet. Create your first one!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtrados.map(c => (
              <div
                key={c._id}
                className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition cursor-pointer ${
                  clienteDetalle?._id === c._id ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
                }`}
                onClick={() => verDetalle(c._id)}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {(c.nombre || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-lg truncate">{c.nombre} {c.apellidos || ''}</p>
                      <p className="text-sm text-gray-500 truncate">{c.empresa || 'Private client'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                  <InfoRow icon={Phone} label="Phone" value={c.telefono || '—'} />
                  <InfoRow icon={Mail} label="Email" value={c.email || '—'} />
                  <InfoRow icon={MapPin} label="City" value={c.ciudad || '—'} />
                  <InfoRow icon={FileText} label="Projects" value={`${c.projectCount || 0} project${(c.projectCount || 0) !== 1 ? 's' : ''}`} />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Click to view full client details</p>
                  <span className="text-sm font-semibold text-blue-600">Open</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {editando ? 'Edit Client' : 'New Client'}
              </h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text" value={form.nombre}
                    onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text" value={form.apellidos}
                    onChange={(e) => setForm(prev => ({ ...prev, apellidos: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
                <input
                  type="text" value={form.empresa}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input
                  type="text" value={form.direccion}
                  onChange={(e) => setForm(prev => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text" value={form.codigoPostal}
                    onChange={(e) => setForm(prev => ({ ...prev, codigoPostal: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text" value={form.ciudad}
                    onChange={(e) => setForm(prev => ({ ...prev, ciudad: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text" value={form.telefono}
                    onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={guardando}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {guardando ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-gray-900">{value}</p>
      </div>
    </div>
  );
}
