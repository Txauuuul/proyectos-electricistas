import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import Step1 from '../components/wizard/Step1';
import Step2 from '../components/wizard/Step2';
import Step3 from '../components/wizard/Step3';
import Step4 from '../components/wizard/Step4';
import { ChevronLeft, Save } from 'lucide-react';

export default function WizardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { pasoActual, setPasoActual, projectData, resetear } = useProject();
  const [draftBanner, setDraftBanner] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Show banner if a draft was found in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wizard_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMs = Date.now() - (parsed.ts || 0);
        const ageHours = ageMs / (1000 * 60 * 60);
        // Show banner only if draft is less than 48h old and has some data
        if (ageHours < 48 && (parsed.data?.nombreCasa || parsed.data?.straat)) {
          setDraftBanner(true);
        }
      }
    } catch (_) {}
  }, []);

  const pasos = [
    { numero: 1, titulo: 'Projectinfo' },
    { numero: 2, titulo: 'Ruimtes' },
    { numero: 3, titulo: "Foto's" },
    { numero: 4, titulo: 'Voltooid' },
  ];

  const handleBack = () => {
    if (pasoActual === 1) {
      navigate('/dashboard');
    } else {
      setPasoActual(pasoActual - 1);
    }
  };

  const renderStep = () => {
    switch (pasoActual) {
      case 1:
        return <Step1 />;
      case 2:
        return <Step2 />;
      case 3:
        return <Step3 />;
      case 4:
        return <Step4 />;
      default:
        return <Step1 />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Draft restored banner */}
      {draftBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <Save size={15} />
            <strong>Draft restored.</strong> Your previous progress has been recovered automatically.
          </p>
          <button
            onClick={() => { resetear(); setDraftBanner(false); }}
            className="text-xs text-amber-700 hover:text-amber-900 underline font-semibold"
          >
            Start fresh
          </button>
        </div>
      )}

      {/* Header con progreso */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={handleBack}
            className="flex gap-2 items-center text-blue-600 hover:text-blue-700 mb-6 font-semibold"
          >
            <ChevronLeft size={20} /> Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-6">New Project</h1>

          {/* Indicador visual de progreso */}
          <div className="flex gap-2 md:gap-4">
            {pasos.map(paso => (
              <div
                key={paso.numero}
                className={`flex-1 h-2 rounded-full transition ${
                  paso.numero <= pasoActual ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-between text-sm text-gray-600">
            {pasos.map(paso => (
              <span
                key={paso.numero}
                className={paso.numero === pasoActual ? 'font-bold text-blue-600' : ''}
              >
                Paso {paso.numero}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Contenido del paso */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderStep()}
      </main>
    </div>
  );
}
