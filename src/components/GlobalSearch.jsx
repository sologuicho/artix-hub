import { useState, useEffect, useRef } from 'react';
import { Search, User, FileText, BookOpen, Calendar, MessageSquare, X, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

import { BACKEND_URL } from '../config/client';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults(null);
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/search/global?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.ok) {
        setResults(data.results);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type, id, category = null) => {
    setIsOpen(false);
    setQuery('');

    switch (type) {
      case 'user':
        navigate(`/profile/${id}`);
        break;
      case 'article':
        navigate(`/articles/${id}`);
        break;
      case 'research':
        navigate(`/research/${id}`);
        break;
      case 'event':
        navigate(`/events/${id}`);
        break;
      case 'post':
        navigate(`/blog`);
        break;
      case 'category':
        if (category.type === 'article') navigate(`/articles?category=${category.name}`);
        else if (category.type === 'research') navigate(`/research?category=${category.name}`);
        else if (category.type === 'event') navigate(`/events?type=${category.name}`);
        else if (category.type === 'post') navigate(`/blog?category=${category.name}`);
        break;
      default:
        break;
    }
  };

  const totalResults = results ?
    (results.users?.length || 0) +
    (results.articles?.length || 0) +
    (results.research?.length || 0) +
    (results.events?.length || 0) +
    (results.posts?.length || 0) +
    (results.categories?.length || 0) : 0;

  return (
    <div className="relative flex-1 max-w-2xl" ref={searchRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && results) {
              setIsOpen(true);
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) {
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              setIsOpen(false);
              setQuery('');
            }
          }}
          placeholder="Buscar..."
          className="w-full pl-10 pr-10 py-2.5 bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner shadow-black/20"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (loading || results) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[80vh] overflow-y-auto custom-scrollbar"
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-sm text-gray-400">Buscando...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron resultados</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {/* Users */}
              {results.users && results.users.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3 h-3" /> Usuarios
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleResultClick('user', user.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all group text-left border border-transparent hover:border-white/5"
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Categories */}
              {results.categories && results.categories.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-3 h-3" /> Categorías
                  </div>
                  <div className="flex flex-wrap gap-2 px-3">
                    {results.categories.map((category, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleResultClick('category', null, category)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-blue-600/20 hover:text-blue-200 border border-white/5 hover:border-blue-500/30 rounded-lg text-xs text-gray-300 transition-all truncate max-w-full"
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles */}
              {results.articles && results.articles.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Artículos
                  </div>
                  {results.articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleResultClick('article', article.id)}
                      className="w-full flex items-start gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all group text-left border border-transparent hover:border-white/5"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate">{article.title}</p>
                        <p className="text-xs text-gray-500 truncate">por {article.author?.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Research */}
              {results.research && results.research.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> Investigaciones
                  </div>
                  {results.research.map((research) => (
                    <button
                      key={research.id}
                      onClick={() => handleResultClick('research', research.id)}
                      className="w-full flex items-start gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all group text-left border border-transparent hover:border-white/5"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-200 group-hover:text-purple-400 transition-colors truncate">{research.title}</p>
                        <p className="text-xs text-gray-500 truncate">por {research.author?.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Events */}
              {results.events && results.events.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Eventos
                  </div>
                  {results.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleResultClick('event', event.id)}
                      className="w-full flex items-start gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all group text-left border border-transparent hover:border-white/5"
                    >
                      <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400 group-hover:bg-green-500/20 group-hover:text-green-300 transition-colors">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-200 group-hover:text-green-400 transition-colors truncate">{event.title}</p>
                        <p className="text-xs text-gray-500 truncate">{event.creator?.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Posts */}
              {results.posts && results.posts.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Blog Posts
                  </div>
                  {results.posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handleResultClick('post', post.id)}
                      className="w-full flex items-start gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all group text-left border border-transparent hover:border-white/5"
                    >
                      <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 group-hover:text-orange-300 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-200 group-hover:text-orange-400 transition-colors truncate">{post.title || 'Sin título'}</p>
                        <p className="text-xs text-gray-500 truncate">{post.author?.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;

