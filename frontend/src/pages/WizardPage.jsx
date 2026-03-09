import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import Step1 from '../components/wizard/Step1';
import Step2 from '../components/wizard/Step2';
import Step3 from '../components/wizard/Step3';
import Step4 from '../components/wizard/Step4';
import { ChevronLeft } from 'lucide-react';

export default function WizardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { pasoActual, setPasoActual, projectData, resetear } = useProject();

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

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
