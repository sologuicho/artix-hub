import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Crown } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import UserMenu from './UserMenu';
import LanguageSelector from './LanguageSelector';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import PricingModal from './PricingModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Header = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const navLinks = [
    { to: '/research', label: t('nav.research') || 'Investigaciones' },
    { to: '/articles', label: t('nav.articles') || 'Artículos' },
    { to: '/events', label: t('nav.events') || 'Eventos' },
    { to: '/blog', label: t('nav.blog') || 'Blog' }
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <header className="sticky top-0 z-50 transition-all duration-300 border-b border-white/5 bg-white/70 dark:bg-black/50 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
              <span className="text-xl tracking-tight font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                ARTIX HUB
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 mx-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive(link.to)
                    ? 'text-white bg-black/10 dark:bg-white/10 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/5 dark:ring-white/10" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Global Search - Desktop */}
            <div className="hidden lg:block flex-1 max-w-sm ml-auto mr-4">
              <GlobalSearch />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Become a Member Button */}
              <button
                onClick={() => setShowPricing(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-yellow-500/20"
              >
                <Crown className="w-3 h-3" />
                Become a Member
              </button>

              <LanguageSelector />
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-800" />
              {isAuthenticated() && <NotificationBell />}
              {isAuthenticated() ? (
                <UserMenu />
              ) : (
                <Link
                  to="/auth"
                  className="hidden sm:flex items-center gap-2 px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-full text-sm font-bold transition-all shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 hover:-translate-y-0.5"
                >
                  {t('nav.login') === 'Log In' ? 'Start' : 'Comenzar'}
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4 px-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl absolute left-0 right-0 shadow-xl">
              {/* Mobile Search */}
              <div className="mb-4">
                <GlobalSearch />
              </div>

              {/* Mobile Navigation */}
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive(link.to)
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowPricing(true);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-yellow-500 hover:bg-yellow-500/10 transition-colors flex items-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Become a Member
                </button>

                {!isAuthenticated() && (
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-4 w-full flex justify-center px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20"
                  >
                    {t('nav.login') === 'Log In' ? 'Start' : 'Comenzar'}
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
};

export default Header;
