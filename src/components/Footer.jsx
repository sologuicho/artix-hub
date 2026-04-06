import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t, language, changeLanguage } = useLanguage();

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-lg">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-black/50 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-xl tracking-tight font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                ARTIX HUB
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              Conectando mentes para dar forma al futuro de la innovación, la investigación y la tecnología.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-6">
              {t('footer.links.articles') || 'Explorar'}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/articles"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('nav.articles')}
                </Link>
              </li>
              <li>
                <Link
                  to="/research"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('nav.research')}
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('nav.events')}
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('nav.blog')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-6">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('footer.links.contact')}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('footer.links.terms')}
                </Link>
              </li>
              <li>
                <Link
                  to="/policies"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {t('footer.links.policies')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Settings */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-6">
                {t('footer.social')}
              </h3>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-all duration-300">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition-all duration-300">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300">
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-4">
                {t('footer.language')}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => changeLanguage('es')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${language === 'es'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                >
                  ES
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${language === 'en'
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} Artix Hub. Made with <span className="text-red-500 animate-pulse">❤</span> for the community.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cookies</a>
            <a href="#" className="text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Guidelines</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

