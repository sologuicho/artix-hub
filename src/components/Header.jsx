import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import PricingModal from './PricingModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const navLinks = [
    ...(isAuthenticated() ? [{ to: '/feed', label: 'Feed' }] : []),
    { to: '/research',  label: t('nav.research')  || 'Investigaciones' },
    { to: '/articles',  label: t('nav.articles')  || 'Artículos'       },
    { to: '/events',    label: t('nav.events')    || 'Eventos'          },
    { to: '/blog',      label: t('nav.blog')      || 'Blog'             },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <header className="navbar sticky top-0 z-50">
        <div className="site-container h-full flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="font-display tracking-widest uppercase"
            style={{ fontSize: '0.9rem', color: 'var(--text)', letterSpacing: '0.2em' }}
          >
            ARTIX
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                style={{
                  color: isActive(link.to) ? 'var(--accent)' : 'var(--muted)',
                }}
                onMouseEnter={e => { if (!isActive(link.to)) e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.color = 'var(--muted)'; }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Search — desktop */}
            <div className="hidden lg:block w-48">
              <GlobalSearch />
            </div>

            <div
              className="hidden lg:block w-px h-4"
              style={{ backgroundColor: 'var(--border)' }}
            />

            {/* Planes link */}
            <button
              onClick={() => setShowPricing(true)}
              className="hidden lg:block font-sans text-xs uppercase tracking-wider transition-colors duration-150"
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Planes
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isDark
                ? <Sun  size={15} />
                : <Moon size={15} />
              }
            </button>

            {/* Notifications + user menu */}
            {isAuthenticated() && <NotificationBell />}
            {isAuthenticated() ? (
              <UserMenu />
            ) : (
              <Link
                to="/auth"
                className="btn btn-primary hidden sm:inline-flex"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.6875rem' }}
              >
                {t('nav.login') === 'Log In' ? 'Comenzar' : 'Comenzar'}
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden"
            style={{
              backgroundColor: 'var(--bg)',
              borderTop: '1px solid var(--border)',
              padding: '1.25rem 1.5rem',
            }}
          >
            <div className="mb-4">
              <GlobalSearch />
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="font-sans text-xs uppercase tracking-wider py-3"
                  style={{
                    color: isActive(link.to) ? 'var(--accent)' : 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { setMobileOpen(false); setShowPricing(true); }}
                className="font-sans text-xs uppercase tracking-wider py-3 text-left"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Planes
              </button>
              {!isAuthenticated() && (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="btn btn-primary mt-4 w-full justify-center"
                >
                  Comenzar
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
};

export default Header;
