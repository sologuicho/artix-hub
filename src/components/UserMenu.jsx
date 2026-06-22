import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const handleProfile = () => {
    navigate('/profile');
    setIsOpen(false);
  };

  const handleSubscription = () => {
    navigate('/subscription');
    setIsOpen(false);
  };


  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name || user.username} className="w-full h-full object-cover" />
          ) : user.profilePicture ? (
            <img src={user.profilePicture} alt={user.name || user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-semibold">
              {(user.name || user.username || 'U').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
          {user.name || user.username}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="glass-card absolute right-0 mt-2 w-48 py-2 z-50">
          <button
            onClick={handleProfile}
            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20 transition-colors rounded-lg mx-2"
          >
            <User className="w-4 h-4" />
            Ver perfil
          </button>
          <button
            onClick={handleSubscription}
            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20 transition-colors rounded-lg mx-2"
          >
            <CreditCard className="w-4 h-4" />
            Mi Suscripción
          </button>
          <div className="border-t border-white/20 dark:border-white/10 my-2"></div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-white/20 dark:hover:bg-black/20 transition-colors rounded-lg mx-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

