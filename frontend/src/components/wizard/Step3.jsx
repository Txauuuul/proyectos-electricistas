import { useRef, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, CheckCircle } from 'lucide-react';

export default function Step3() {
  const { projectData, agregarFotos, setPasoActual } = useProject();
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [cargando, setCargando] = useState(false);

  const handleUploadFotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        agregarFotos([event.target.result]);
      };
      reader.readAsDataURL(file);
    });

    fileInputRef.current.value = '';
  };

  const handleGuardarProyecto = async () => {
    // Validar que haya al menos un plano
    if (!projectData.planos || projectData.planos.length === 0) {
      alert('U moet minstens één plattegrond toevoegen voordat u afrondt');
      return;
    }

    setCargando(true);
    try {
      console.log('=== Guardando Proyecto ===');
      console.log('Token disponible:', !!token);
      console.log('Datos a guardar:', {
        nombreCasa: projectData.nombreCasa,
        direccion: projectData.direccion,
        fechaInicio: projectData.fechaInicio,
        planosCount: projectData.planos.length,
        fotosCount: projectData.fotosLocalizacion.length,
      });

      const fetchBody = {
        nombreCasa: projectData.nombreCasa,
        direccion: projectData.direccion,
        fechaInicio: projectData.fechaInicio,
        planos: projectData.planos || [],
        fotosLocalizacion: projectData.fotosLocalizacion || [],
        clienteId: projectData.clienteId || undefined,
        tituloPersonalizado: projectData.tituloPersonalizado || undefined,
      };

      console.log('Cuerpo a enviar:', JSON.stringify(fetchBody, null, 2).substring(0, 500) + '...');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/proyectos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fetchBody),
      });

      console.log('Respuesta del servidor - Status:', response.status);

      const data = await response.json();
      console.log('Respuesta del servidor - Datos:', data);

      if (!response.ok) {
        console.error('Error en respuesta:', data);
        throw new Error(data.error || data.message || `Error HTTP ${response.status}`);
      }

      console.log('✅ Proyecto guardado exitosamente:', data._id);
      setPasoActual(4);
    } catch (error) {
      console.error('❌ Error completo:', error);
      alert(`Fout bij opslaan van het project: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Zona de carga */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-8">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#29ace3] rounded-lg p-6 sm:p-12 text-center cursor-pointer hover:border-[#29ace3] hover:bg-[#eaf7fd] transition"
        >
          <Upload size={48} className="mx-auto mb-4 text-[#29ace3]" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Locatiefoto's uploaden</h3>
          <p className="text-gray-600 mb-4">Klik hier om foto's te uploaden of sleep ze hierheen</p>
          <p className="text-sm text-gray-500">JPG, PNG (meerdere bestanden toegestaan)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleUploadFotos}
          className="hidden"
        />
      </div>

      {/* Galería de fotos */}
      {projectData.fotosLocalizacion.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Geüploade foto's ({projectData.fotosLocalizacion.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projectData.fotosLocalizacion.map((foto, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={foto}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    // Eliminar foto
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={() => setPasoActual(2)}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl transition active:scale-95"
        >
          Terug
        </button>
        <button
          onClick={handleGuardarProyecto}
          disabled={cargando || projectData.fotosLocalizacion.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl flex gap-2 items-center justify-center transition active:scale-95"
        >
          <CheckCircle size={20} /> <span className="hidden xs:inline">Afronden en </span>verzenden
        </button>
      </div>
    </div>
  );
}
