import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, BookOpen, Calendar, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FloatingActionButton = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated()) return null;

  const actions = [
    {
      icon: Search,
      label: 'Crear Investigación',
      path: '/research/create',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    {
      icon: FileText,
      label: 'Crear Artículo',
      path: '/articles/create',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      icon: BookOpen,
      label: 'Crear Post del Blog',
      path: '/blog/create',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      icon: Calendar,
      label: 'Crear Evento',
      path: '/events/create',
      color: 'bg-green-600 hover:bg-green-700',
    },
  ];

  const handleAction = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons */}
      {isOpen && (
        <div className="mb-4 space-y-3">
          {actions.map((action, index) => (
            <div
              key={action.path}
              className="flex items-center gap-3"
              style={{
                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              <span className="glass-card text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-1 whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleAction(action.path)}
                className="glass-fab w-14 h-14 flex items-center justify-center text-gray-900 dark:text-gray-100"
              >
                <action.icon className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`glass-fab w-14 h-14 flex items-center justify-center text-gray-900 dark:text-gray-100 transition-all transform ${
          isOpen ? 'rotate-45' : 'hover:scale-110'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingActionButton;

