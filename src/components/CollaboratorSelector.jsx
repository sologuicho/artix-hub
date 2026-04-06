import { useState, useEffect } from 'react';
import { Search, X, UserPlus, Check, XCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const CollaboratorSelector = ({ selectedCollaborators, onSelect, onRemove, placeholder = 'Buscar usuarios...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useState(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchUsers(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setUsers([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  const fetchUsers = async (query) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        // Filter out already selected users
        const filtered = (data.users || []).filter(
          user => !selectedCollaborators.some(c => c.id === user.id)
        );
        setUsers(filtered);
        setShowDropdown(filtered.length > 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSelect = (user) => {
    onSelect(user);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (users.length > 0) setShowDropdown(true);
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 glass-input text-gray-900 dark:text-gray-100"
          />
        </div>

        {showDropdown && users.length > 0 && (
          <div className="absolute z-50 mt-1 w-full glass-card shadow-xl max-h-60 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className="w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 text-left"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {user.name || 'Usuario'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{user.username || 'usuario'}
                  </p>
                </div>
                <UserPlus className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Collaborators */}
      {selectedCollaborators.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Colaboradores seleccionados ({selectedCollaborators.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm"
              >
                {collaborator.avatar ? (
                  <img src={collaborator.avatar} alt={collaborator.name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {collaborator.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span>{collaborator.name || collaborator.username}</span>
                <button
                  onClick={() => onRemove(collaborator.id)}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorSelector;




