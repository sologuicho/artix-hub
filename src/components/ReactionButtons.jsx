import { ThumbsUp, Heart, Hand, Laugh, MessageCircle } from 'lucide-react';

const REACTION_TYPES = {
  like: { icon: ThumbsUp, label: 'Me gusta', color: 'blue' },
  heart: { icon: Heart, label: 'Me encanta', color: 'red' },
  clap: { icon: Hand, label: 'Aplaudir', color: 'purple' },
  laugh: { icon: Laugh, label: 'Divertido', color: 'yellow' }
};

const ReactionButtons = ({ postId, articleId, reactions, onReaction, className = '' }) => {
  const getColorClasses = (type, isActive) => {
    const colors = {
      blue: isActive ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      red: isActive ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      purple: isActive ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      yellow: isActive ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
    };
    return colors[type] || colors.blue;
  };

  const getCountKey = (type) => {
    const mapping = {
      like: 'likesCount',
      heart: 'heartsCount',
      clap: 'clapsCount',
      laugh: 'laughsCount'
    };
    return mapping[type] || `${type}Count`;
  };

  const getActiveKey = (type) => {
    const mapping = {
      like: 'liked',
      heart: 'hearted',
      clap: 'clapped',
      laugh: 'laughed'
    };
    return mapping[type] || type;
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {Object.entries(REACTION_TYPES).map(([type, config]) => {
        const Icon = config.icon;
        const isActive = reactions?.[getActiveKey(type)] || false;
        const count = reactions?.[getCountKey(type)] || 0;

        return (
          <button
            key={type}
            onClick={() => onReaction(type)}
            className={`flex items-center gap-1.5 transition-colors ${
              isActive 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            title={config.label}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
            {count > 0 && <span className="text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ReactionButtons;

