import React from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * AnimatedCard Component
 * Wraps content in a glassmorphism card with entry animations and hover effects
 * Uses Tailwind CSS and standard CSS transitions
 */
const AnimatedCard = ({ 
  children, 
  className = '', 
  delay = 0,
  onClick
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`
        glass-card 
        transform transition-all duration-500 ease-out
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;
