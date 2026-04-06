import { Lock, User, Calendar } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ContentActions from './ContentActions';
import { useAuth } from '../context/AuthContext';

const ArticleCard = ({ article, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReadArticle = (e) => {
    // Don't navigate if clicking on ContentActions
    if (e.target.closest('.content-actions')) return;
    navigate(`/articles/${article.id}`);
  };

  return (
    <div className="glass-card hover:shadow-xl transition-all duration-300 overflow-hidden group relative">
      {/* Actions Button */}
      {user && (
        <div className="absolute top-4 right-4 z-10 content-actions">
          <ContentActions
            type="article"
            itemId={article.id}
            authorId={article.authorId || article.author?.id}
            author={article.author}
            onDelete={onDelete}
          />
        </div>
      )}

      <div onClick={handleReadArticle} className="cursor-pointer">
        {article.coverUrl ? (
          <div className="relative aspect-video w-full overflow-hidden">
            <img src={article.coverUrl} alt={article.title} className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-black shadow-md">
                {article.category}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-black shadow-md">
                {article.category}
              </span>
            </div>
          </div>
        )}
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
            {article.title}
          </h3>
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {article.description}
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link
                to={`/profile/${article.author?.id || article.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:text-blue-400 transition-colors"
              >
                {article.author?.avatar ? (
                  <img
                    src={article.author.avatar}
                    alt={article.author.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-white">
                    {article.author?.name || article.author || 'Autor'}
                  </span>
                  {article.author?.occupation && (
                    <span className="text-xs text-gray-500">
                      {article.author.occupation}
                    </span>
                  )}
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{article.createdAt ? new Date(article.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : article.date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;

