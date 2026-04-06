import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Calendar, User } from 'lucide-react';

const PremiumCard = ({
    title,
    description,
    imageUrl,
    category,
    author,
    date,
    stats = [],
    className,
    delay = 0,
    onClick,
    children
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                delay: delay,
                ease: "easeOut"
            }}
            onClick={onClick}
            className={clsx(
                "glass-card-premium rounded-2xl group relative overflow-hidden flex flex-col h-full",
                onClick && "cursor-pointer",
                className
            )}
        >
            {/* Image Section */}
            {(imageUrl || category) && (
                <div className="relative aspect-video w-full overflow-hidden">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                            <span className="text-3xl">✨</span>
                        </div>
                    )}

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent opacity-80" />

                    {/* Category Badge */}
                    {category && (
                        <div className="absolute top-4 left-4">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
                                {category}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Content Section */}
            <div className="flex-1 p-6 flex flex-col relative z-10 -mt-8">
                <div className="flex-1">
                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {title}
                    </h3>

                    {/* Description */}
                    {description && (
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                            {description}
                        </p>
                    )}
                </div>

                {/* Meta Info */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        {/* Author using the passed Author object or just name */}
                        <div className="flex items-center gap-2">
                            {author?.avatar ? (
                                <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                            <span className="text-gray-300">{author?.name || 'Artix User'}</span>
                        </div>

                        {date && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{date}</span>
                            </div>
                        )}
                    </div>

                    {/* Custom Stats */}
                    {stats.length > 0 && (
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="flex items-center gap-1.5" title={stat.label}>
                                    <stat.icon className="w-3.5 h-3.5" />
                                    <span>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic Glow Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </motion.div>
    );
};

export default PremiumCard;
