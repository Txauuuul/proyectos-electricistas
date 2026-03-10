import { useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { CheckCircle } from 'lucide-react';

export default function Step4() {
  const navigate = useNavigate();
  const { resetear } = useProject();

  const handleNuevoProyecto = () => {
    resetear();
    navigate('/nuevo-proyecto');
  };

  const handleIrDashboard = () => {
    resetear();
    navigate('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <CheckCircle size={80} className="mx-auto text-green-600 mb-6" />
        
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Project succesvol aangemaakt!
        </h2>

        <p className="text-xl text-gray-600 mb-12">
          Uw project is correct opgeslagen. U kunt het bekijken in uw dashboard of een nieuw project aanmaken.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleIrDashboard}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-lg"
          >
            Ga naar dashboard
          </button>

          <button
            onClick={handleNuevoProyecto}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition text-lg"
          >
            Nieuw project aanmaken
          </button>
        </div>
      </div>
    </div>
  );
}
