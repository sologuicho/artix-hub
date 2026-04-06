import { User } from 'lucide-react';

const CompetitionCard = ({ competition }) => {
  return (
    <div className="glass-card hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-600 dark:to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100">
            {competition.category}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {competition.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {competition.description}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <User className="w-4 h-4" />
          <span>{competition.author}</span>
        </div>
      </div>
    </div>
  );
};

export default CompetitionCard;

