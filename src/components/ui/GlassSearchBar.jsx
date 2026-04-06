import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlassSearchBar = ({ onSearch, placeholder = "Search...", categories = [], activeCategory, onCategoryChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleSearchCommit = (term) => {
        setSearchTerm(term);
        onSearch({ query: term });
    };

    return (
        <div className="relative group w-full max-w-2xl z-50">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Input Field */}
            <div className={`relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-white/10 border-white/20' : ''}`}>
                <Search className="w-5 h-5 text-gray-400 ml-4 shrink-0" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => handleSearchCommit(e.target.value)}
                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 py-4 px-4 h-14"
                />
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`mr-2 p-2 rounded-xl transition-all duration-300 ${isOpen ? 'bg-white text-black' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                >
                    {isOpen ? <X className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
                </button>
            </div>

            {/* Filter Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full mt-4 left-0 w-full p-6 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                    >
                        <div className="flex flex-col gap-4">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categories</h4>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => onCategoryChange(cat.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeCategory === cat.id
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {cat.label}
                                            {activeCategory === cat.id && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlassSearchBar;
