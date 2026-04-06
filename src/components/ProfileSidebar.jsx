import { Link } from 'react-router-dom';
import { User, MapPin, Briefcase, GraduationCap, Eye, TrendingUp, Building2, Bookmark, Archive, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfileSidebar = ({ user: profileUser, stats }) => {
  const { user: currentUser } = useAuth();
  const user = profileUser || currentUser;

  if (!user) return null;

  return (
    <aside className="w-72 space-y-6">
      {/* Profile Card */}
      <div className="bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6 relative">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-[20px] opacity-20" />
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="relative w-24 h-24 rounded-full border-4 border-[#0A0A0B] object-cover shadow-2xl"
              />
            ) : (
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-[#0A0A0B] shadow-2xl">
                {user.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-[#0A0A0B] rounded-full" />
          </div>

          <h3 className="text-xl font-bold text-white text-center mb-1 leading-tight px-2">
            {user.name || 'Usuario'}
          </h3>
          {user.occupation && (
            <p className="text-sm text-gray-400 text-center font-medium">
              {user.occupation}
            </p>
          )}
          {user.country && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 py-1 px-3 bg-white/5 rounded-full">
              <MapPin className="w-3 h-3" />
              <span>{user.country}</span>
            </div>
          )}
        </div>

        {/* Interests - Modern Pills */}
        {user.interests && user.interests.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Interests</p>
            <div className="flex flex-wrap gap-2">
              {user.interests.slice(0, 4).map((interest, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md text-xs font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4">
            <div className="text-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              <span className="block text-lg font-bold text-white">{stats.profileViews || 0}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Views</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              <span className="block text-lg font-bold text-white">{stats.postImpressions || 0}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Reach</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Card */}
      {user.id === currentUser?.id && (
        <div className="bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-4 px-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Quick Actions
          </h4>
          <nav className="space-y-1">
            <Link
              to="/research/create"
              className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all duration-300"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
              Create Research
            </Link>
            <Link
              to="/articles/create"
              className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all duration-300"
            >
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Briefcase className="w-4 h-4" />
              </div>
              Write Article
            </Link>
            <Link
              to="/events/create"
              className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all duration-300"
            >
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
              Host Event
            </Link>
          </nav>
        </div>
      )}

      {/* Library Actions */}
      {user.id === currentUser?.id && (
        <div className="bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl">
          <nav className="space-y-1">
            <Link
              to="/saved"
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Bookmark className="w-4 h-4" />
                Saved Items
              </span>
            </Link>
            <Link
              to="/archived"
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Archive className="w-4 h-4" />
                Archived
              </span>
            </Link>
          </nav>
        </div>
      )}
    </aside>
  );
};

export default ProfileSidebar;


