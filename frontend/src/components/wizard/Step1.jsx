import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useProject } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import { ChevronRight, Plus, Users } from "lucide-react";

export default function Step1() {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      nombreCasa: "",
      straat: "",
      nr: "",
      postcode: "",
      stad: "",
      fechaInicio: "",
      tituloPersonalizado: "",
      clienteId: "",
      ofertaDirectaCliente: true,
      extraInfo: "",
    }
  });

  const { actualizarInfoProyecto, setPasoActual } = useProject();
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientApellidos, setNewClientApellidos] = useState("");
  const [previewTitulo, setPreviewTitulo] = useState("");

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/proyectos/preview-titulo`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.titulo) setPreviewTitulo(data.titulo); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/clientes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setClientes(data))
      .catch(() => {});
  }, [token]);

  const handleCreateQuickClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const res = await fetch(`${API}/clientes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newClientName, apellidos: newClientApellidos }),
      });
      if (res.ok) {
        const c = await res.json();
        setClientes(prev => [...prev, c]);
        setValue("clienteId", c._id);
        setShowNewClient(false);
        setNewClientName("");
        setNewClientApellidos("");
      }
    } catch (e) { console.error(e); }
  };

  const onSubmit = (data) => {
    // Use the preview title as the house name if no custom name
    if (!data.nombreCasa) data.nombreCasa = previewTitulo || "project";
    actualizarInfoProyecto(data);
    setPasoActual(2);
  };

  const inp = (err) =>
    `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#29ace3] focus:border-transparent outline-none transition text-sm ${err ? "border-red-500" : "border-gray-300"}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nieuw project aanmaken</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Auto projectnaam */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Projectnaam (automatisch)</label>
            <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono">
              {previewTitulo || "Wordt automatisch toegewezen\u2026"}
            </div>
          </div>

          {/* Aangepaste naam */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Aangepaste naam</label>
            <input type="text" {...register("tituloPersonalizado")} className={inp(false)} placeholder="Bijv. Keukenrenovatie Van Damme" />
          </div>

          {/* Eindklant */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Users size={13} /> Eindklant (optioneel)
            </label>
            <div className="flex gap-2">
              <select {...register("clienteId")} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none text-sm">
                <option value="">&mdash; Geen klant geselecteerd &mdash;</option>
                {clientes.map(c => (
                  <option key={c._id} value={c._id}>{c.nombre} {c.apellidos || ""} {c.empresa ? `(${c.empresa})` : ""}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowNewClient(!showNewClient)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700" title="Nieuwe klant aanmaken">
                <Plus size={18} />
              </button>
            </div>
            {showNewClient && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border space-y-3">
                <p className="text-sm font-semibold text-gray-700">Snelle klant aanmaken</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Voornaam *" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#29ace3]" />
                  <input type="text" placeholder="Achternaam" value={newClientApellidos} onChange={e => setNewClientApellidos(e.target.value)} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#29ace3]" />
                </div>
                <button type="button" onClick={handleCreateQuickClient} disabled={!newClientName.trim()} className="px-4 py-2 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg text-sm font-semibold disabled:opacity-50">Aanmaken &amp; selecteren</button>
              </div>
            )}
          </div>

          {/* Straat + Nr. */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Straat *</label>
              <input type="text" {...register("straat", { required: "Verplicht veld" })} className={inp(errors.straat)} placeholder="Bijv. Kerkstraat" />
              {errors.straat && <p className="text-red-600 text-xs mt-1">{errors.straat.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Nr. *</label>
              <input type="text" {...register("nr", { required: "Verplicht" })} className={inp(errors.nr)} placeholder="12" />
              {errors.nr && <p className="text-red-600 text-xs mt-1">{errors.nr.message}</p>}
            </div>
          </div>

          {/* Postcode + Stad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Postcode *</label>
              <input type="text" {...register("postcode", { required: "Verplicht veld" })} className={inp(errors.postcode)} placeholder="1000" />
              {errors.postcode && <p className="text-red-600 text-xs mt-1">{errors.postcode.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Stad *</label>
              <input type="text" {...register("stad", { required: "Verplicht veld" })} className={inp(errors.stad)} placeholder="Brussel" />
              {errors.stad && <p className="text-red-600 text-xs mt-1">{errors.stad.message}</p>}
            </div>
          </div>

          {/* Startdatum */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Startdatum *</label>
            <input type="date" {...register("fechaInicio", { required: "Verplicht veld" })} className={inp(errors.fechaInicio)} />
            {errors.fechaInicio && <p className="text-red-600 text-xs mt-1">{errors.fechaInicio.message}</p>}
          </div>

          {/* Offerte rechtstreeks naar klant */}
          <div className="flex items-center gap-3 p-3 bg-[#eaf7fd] border border-[#a8dcf0] rounded-lg">
            <input type="checkbox" id="ofertaDirecta" {...register("ofertaDirectaCliente")} defaultChecked className="w-4 h-4 accent-blue-600 cursor-pointer" />
            <label htmlFor="ofertaDirecta" className="text-sm font-medium text-[#1a6a8a] cursor-pointer select-none">Offerte rechtstreeks naar de klant sturen</label>
          </div>

          {/* Extra informatie */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">(Extra) informatie over klant/ prospect en/ of opdracht</label>
            <textarea {...register("extraInfo")} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] focus:border-transparent outline-none transition text-sm resize-none" placeholder="Notities over de klant, de opdracht of de locatie\u2026" />
          </div>

          {/* Volgende stap */}
          <button type="submit" className="w-full bg-[#29ace3] hover:bg-[#1d96cb] text-white font-bold py-3 rounded-lg flex gap-2 items-center justify-center transition mt-6">
            Volgende stap <ChevronRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
