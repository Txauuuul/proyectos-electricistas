import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Trash2, Edit2, X, Search, User, Phone, Mail, MapPin, FileText, ChevronRight,
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
          <p className="text-gray-600">Manage the end-customers for your projects.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          <Plus size={18} /> New Client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, company or email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client list */}
        <div className="lg:col-span-2 space-y-3">
          {cargando ? (
            <p className="text-gray-500 py-12 text-center">Loading...</p>
          ) : filtrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <User size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {busqueda ? 'No clients match your search' : 'No clients yet. Create your first one!'}
              </p>
            </div>
          ) : (
            filtrados.map(c => (
              <div
                key={c._id}
                className={`bg-white rounded-lg shadow-md p-4 flex items-center justify-between hover:shadow-lg transition cursor-pointer ${
                  clienteDetalle?._id === c._id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => verDetalle(c._id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {(c.nombre || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{c.nombre} {c.apellidos || ''}</p>
                    <p className="text-sm text-gray-500">
                      {c.empresa && <span>{c.empresa} • </span>}
                      {c.projectCount || 0} project{(c.projectCount || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-1">
          {clienteDetalle ? (
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="font-bold text-gray-900 text-lg mb-4">
                {clienteDetalle.cliente?.nombre || clienteDetalle.nombre} {clienteDetalle.cliente?.apellidos || clienteDetalle.apellidos || ''}
              </h2>
              <div className="space-y-3 text-sm">
                {(clienteDetalle.cliente?.empresa || clienteDetalle.empresa) && (
                  <InfoRow icon={User} label="Company" value={clienteDetalle.cliente?.empresa || clienteDetalle.empresa} />
                )}
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

              {/* Projects list */}
              {clienteDetalle.proyectos && clienteDetalle.proyectos.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText size={16} /> Projects ({clienteDetalle.proyectos.length})
                  </h3>
                  <div className="space-y-2">
                    {clienteDetalle.proyectos.map(p => (
                      <button
                        key={p._id}
                        onClick={() => navigate(`/proyecto/${p._id}`)}
                        className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition text-sm"
                      >
                        <p className="font-semibold text-gray-900">{p.tituloAutomatico || p.nombreCasa}</p>
                        <p className="text-gray-500 text-xs">{p.estado} • {new Date(p.fechaInicio).toLocaleDateString()}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-400">
              <User size={36} className="mx-auto mb-3" />
              <p className="text-sm">Select a client to see details</p>
            </div>
          )}
        </div>
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
