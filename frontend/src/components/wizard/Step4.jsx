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
          Project Created Successfully!
        </h2>

        <p className="text-xl text-gray-600 mb-12">
          Your project has been saved correctly. You can view it in your dashboard or create a new one.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleIrDashboard}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-lg"
          >
            Go to Dashboard
          </button>

          <button
            onClick={handleNuevoProyecto}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition text-lg"
          >
            Create New Project
          </button>
        </div>
      </div>
    </div>
  );
}
