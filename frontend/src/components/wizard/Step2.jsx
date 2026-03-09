import { useState, useRef } from "react";
import { useProject } from "../../context/ProjectContext";
import { useAuth } from "../../context/AuthContext";
import { Upload, Plus, Trash2, CheckCircle, Camera, PenTool } from "lucide-react";
import CanvasEditor from "../canvas/CanvasEditor";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Convert a PDF file to a base64 PNG image (first page)
async function pdfToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdf = await pdfjs.getDocument({ data: e.target.result }).promise;
        const page = await pdf.getPage(1);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const vp = page.getViewport({ scale: 2 });
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        resolve(canvas.toDataURL("image/png"));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const emptyRuimte = () => ({ naam: "", omschrijving: "", platteGrond: null, fotos: [], marcadores: [], dataDibujo: null });

export default function Step2() {
  const { projectData, setPasoActual } = useProject();
  const { token } = useAuth();

  // The ruimte currently being filled in
  const [current, setCurrent] = useState(emptyRuimte());
  // List of saved ruimtes
  const [ruimtes, setRuimtes] = useState([]);
  const [saving, setSaving] = useState(false);

  const platteGrondRef = useRef(null);
  const fotosRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasEditorRef = useRef(null);

  const API = import.meta.env.VITE_API_URL;

  // Handle floor plan upload (PDF or image)
  const handlePlatteGrond = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let base64;
      if (file.type === "application/pdf") {
        base64 = await pdfToBase64(file);
      } else {
        base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = ev => res(ev.target.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }
      setCurrent(prev => ({ ...prev, platteGrond: base64, marcadores: [], dataDibujo: null }));
    } catch (err) {
      alert("Fout bij verwerken van bestand: " + err.message);
    }
    if (platteGrondRef.current) platteGrondRef.current.value = "";
  };

  // Handle multiple photo uploads
  const handleFotos = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setCurrent(prev => ({ ...prev, fotos: [...prev.fotos, ev.target.result] }));
      };
      reader.readAsDataURL(file);
    });
    if (e.target === fotosRef.current && fotosRef.current) fotosRef.current.value = "";
    if (e.target === cameraRef.current && cameraRef.current) cameraRef.current.value = "";
  };

  // Capture canvas state before saving ruimte
  const captureAndSaveRuimte = (ruimteBase) => {
    let canvasData = { marcadores: [], dataDibujo: null };
    if (canvasEditorRef.current && ruimteBase.platteGrond) {
      canvasData = canvasEditorRef.current.getCanvasData();
    }
    return { ...ruimteBase, marcadores: canvasData.marcadores, dataDibujo: canvasData.dataDibujo };
  };

  // Save current ruimte and start a new one
  const handleVoegRuimteToe = () => {
    if (!current.naam.trim()) {
      alert("Geef de ruimte een naam.");
      return;
    }
    const saved = captureAndSaveRuimte(current);
    setRuimtes(prev => [...prev, saved]);
    setCurrent(emptyRuimte());
  };

  // Submit the entire project
  const handleAfronden = async () => {
    const currentSaved = current.naam.trim() ? captureAndSaveRuimte(current) : null;
    const allRuimtes = currentSaved ? [...ruimtes, currentSaved] : ruimtes;

    if (allRuimtes.length === 0) {
      alert("Voeg minimaal een ruimte toe.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        nombreCasa: projectData.nombreCasa || projectData.tituloPersonalizado || "project",
        straat: projectData.straat || "",
        nr: projectData.nr || "",
        postcode: projectData.postcode || "",
        stad: projectData.stad || "",
        fechaInicio: projectData.fechaInicio,
        planos: projectData.planos || [],
        fotosLocalizacion: projectData.fotosLocalizacion || [],
        clienteId: projectData.clienteId || undefined,
        tituloPersonalizado: projectData.tituloPersonalizado || undefined,
        ofertaDirectaCliente: projectData.ofertaDirectaCliente !== false,
        extraInfo: projectData.extraInfo || "",
        ruimtes: allRuimtes,
      };

      const res = await fetch(`${API}/proyectos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);

      setPasoActual(4);
    } catch (err) {
      alert("Fout bij opslaan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* List of already-added ruimtes */}
      {ruimtes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Toegevoegde ruimtes ({ruimtes.length})</h3>
          <div className="space-y-2">
            {ruimtes.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.naam}</p>
                  {r.omschrijving && <p className="text-xs text-gray-500 mt-0.5">{r.omschrijving.substring(0, 60)}{r.omschrijving.length > 60 ? "..." : ""}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.platteGrond ? "Platte grond ✓" : "Geen platte grond"}
                    {r.marcadores?.length > 0 ? ` · ${r.marcadores.length} marker(s)` : ""}
                    {r.dataDibujo ? " · tekening ✓" : ""}
                    {" · "}{r.fotos.length} foto{r.fotos.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => setRuimtes(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current ruimte form */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
        <h3 className="text-base font-bold text-gray-900 border-b pb-3">
          {ruimtes.length === 0 ? "Ruimte 1" : `Ruimte ${ruimtes.length + 1}`}
        </h3>

        {/* RUIMTEnaam */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">RUIMTEnaam:</label>
          <input
            type="text"
            value={current.naam}
            onChange={e => setCurrent(prev => ({ ...prev, naam: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            placeholder="Bijv. Woonkamer, Keuken, Slaapkamer..."
          />
        </div>

        {/* Omschrijving ruimte */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Omschrijving ruimte</label>
          <textarea
            value={current.omschrijving}
            onChange={e => setCurrent(prev => ({ ...prev, omschrijving: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
            placeholder="Beschrijf de ruimte..."
          />
        </div>

        {/* Platte grond + Canvas Editor */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Platte grond</label>
          {current.platteGrond ? (
            <div className="space-y-3">
              <CanvasEditor
                ref={canvasEditorRef}
                imagenBase64={current.platteGrond}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <PenTool size={12} /> Teken vrij of voeg markers toe via de toolbar
                </span>
                <button
                  type="button"
                  onClick={() => setCurrent(prev => ({ ...prev, platteGrond: null, marcadores: [], dataDibujo: null }))}
                  className="ml-auto px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                >
                  Verwijder platte grond
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => platteGrondRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">upload pdf.</p>
            </div>
          )}
          <input ref={platteGrondRef} type="file" accept="image/*,.pdf" onChange={handlePlatteGrond} className="hidden" />
        </div>

        {/* Foto&apos;s */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Foto&apos;s</label>
          <div className="flex flex-wrap gap-3 items-start">
            {current.fotos.map((f, i) => (
              <div key={i} className="relative group w-20 h-20">
                <img src={f} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                <button
                  onClick={() => setCurrent(prev => ({ ...prev, fotos: prev.fotos.filter((_, idx) => idx !== i) }))}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                >
                  &times;
                </button>
              </div>
            ))}
            {/* Upload box + Camera box */}
            <div
              onClick={() => fotosRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
              title="Upload foto"
            >
              <span className="text-gray-400 text-2xl leading-none">+</span>
              <span className="text-gray-400 text-xs mt-0.5">upload</span>
            </div>
            <div
              onClick={() => cameraRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-green-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition"
              title="Maak foto met camera"
            >
              <Camera size={20} className="text-green-500 mb-0.5" />
              <span className="text-green-500 text-xs">camera</span>
            </div>
            <input ref={fotosRef} type="file" multiple accept="image/*" onChange={handleFotos} className="hidden" />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFotos} className="hidden" />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {/* VOEG RUIMTE TOE */}
        <button
          onClick={handleVoegRuimteToe}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-lg flex gap-2 items-center justify-center transition text-sm"
        >
          <Plus size={18} /> VOEG RUIMTE TOE (MET PLAN) &nbsp;<span className="font-normal opacity-80">(add another space)</span>
        </button>

        {/* AFRONDEN */}
        <button
          onClick={handleAfronden}
          disabled={saving}
          className="w-full bg-pink-400 hover:bg-pink-500 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg flex gap-2 items-center justify-center transition text-sm"
        >
          {saving ? "Bezig met opslaan..." : <><CheckCircle size={18} /> AFRONDEN (submit)</>}
        </button>

        {/* vorige stap */}
        <button
          onClick={() => setPasoActual(1)}
          className="w-fit bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
        >
          vorige stap
        </button>
      </div>
    </div>
  );
}
