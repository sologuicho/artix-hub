import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const HeroVideo = ({ onScroll }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setScrollY(currentScroll);

      if (heroRef.current) {
        const heroHeight = heroRef.current.offsetHeight;
        const scrollProgress = currentScroll / heroHeight;
        const opacity = Math.max(0, 1 - scrollProgress * 1.2);
        const translateY = -currentScroll * 0.3;

        if (videoRef.current) {
          videoRef.current.style.opacity = opacity;
          videoRef.current.style.transform = `translateY(${translateY}px) scale(1.1)`;
        }

        if (contentRef.current) {
          contentRef.current.style.opacity = opacity;
          contentRef.current.style.transform = `translateY(${currentScroll * 0.2}px)`;
        }
      }

      if (onScroll) {
        onScroll(currentScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  return (
    <div
      ref={heroRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Video Background */}
      <div
        ref={videoRef}
        className="absolute inset-0 w-full h-full transition-opacity duration-500"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/index-video.mp4" type="video/mp4" />
          {/* Fallback si el video no carga */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600"></div>
        </video>
        {/* Overlay oscuro para mejor legibilidad */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
        {/* Blur overlay adicional */}
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      {/* Contenido del Hero */}
      <div ref={contentRef} className="relative z-10 h-full flex items-center transition-opacity duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            {/* Badge/Tag */}
            <div className="mb-6 inline-block">
              <span className="px-4 py-2 border border-white/30 rounded-full text-white/90 text-sm font-medium backdrop-blur-sm bg-white/10">
                {t('home.hero.badge')}
              </span>
            </div>

            {/* Título Principal */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              {t('home.hero.title').split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/auth')}
              className="glass-button px-8 py-4 text-gray-900 dark:text-gray-100 flex items-center gap-2 group"
            >
              {t('home.hero.cta')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>


      </div>

      {/* Elementos decorativos naranjas (opcionales) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
    </div>
  );
};

export default HeroVideo;

