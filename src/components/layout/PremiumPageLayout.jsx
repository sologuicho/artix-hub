import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const PremiumPageLayout = ({ children, title, subtitle, className }) => {
    // Ensure dark mode styles are prioritized for these pages
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    return (
        <div className={clsx("min-h-screen bg-transparent text-white relative overflow-hidden", className)}>
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            <div className="relative z-10 pt-24 pb-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                >
                    {(title || subtitle) && (
                        <div className="mb-12 text-center md:text-left relative">
                            {/* Optional: Add a subtle decorative line or icon */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: 60 }}
                                className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 mb-6 hidden md:block"
                                transition={{ delay: 0.5, duration: 0.8 }}
                            />

                            {title && (
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight"
                                >
                                    {title}
                                </motion.h1>
                            )}
                            {subtitle && (
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-xl text-gray-400 max-w-2xl leading-relaxed"
                                >
                                    {subtitle}
                                </motion.p>
                            )}
                        </div>
                    )}

                    {children}
                </motion.div>
            </div>
        </div>
    );
};

export default PremiumPageLayout;
