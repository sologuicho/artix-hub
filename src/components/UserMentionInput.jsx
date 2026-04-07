import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

import { BACKEND_URL } from '../config/client';

const UserMentionInput = ({ value, onChange, placeholder = 'Mencionar a alguien...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (searchQuery.startsWith('@') && searchQuery.length > 1) {
      const query = searchQuery.substring(1);
      fetchUsers(query);
      setShowDropdown(true);
      setMentionStart(value.lastIndexOf('@'));
    } else {
      setShowDropdown(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async (query) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleMention = (user) => {
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(value.length);
    const newValue = `${beforeMention}@${user.username || user.name} ${afterMention}`;
    onChange(newValue);
    setSelectedUsers(prev => [...prev, user.id]);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const removeMention = (userId) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
    // Remove mention from text
    const newValue = value.replace(new RegExp(`@[^\\s]+`, 'g'), (match) => {
      // This is a simplified version - you might want to track mentions better
      return '';
    });
    onChange(newValue.trim());
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedUsers.map((userId) => {
          const user = users.find(u => u.id === userId);
          if (!user) return null;
          return (
            <span
              key={userId}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-sm"
            >
              @{user.username || user.name}
              <button
                onClick={() => removeMention(userId)}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSearchQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === '@') {
            setMentionStart(e.target.selectionStart);
          }
        }}
        placeholder={placeholder}
        className="w-full glass-input text-gray-900 dark:text-gray-100 min-h-[100px]"
        rows={4}
      />
      {showDropdown && users.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full glass-card shadow-xl max-h-60 overflow-y-auto"
        >
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleMention(user)}
              className="w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 text-left"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {user.name || 'Usuario'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{user.username || 'usuario'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserMentionInput;





