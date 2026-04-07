import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PLANS = [
    {
        name: 'Observer',
        price: 0,
        features: [
            'Access to public articles',
            'View event calendar',
            'Join global discussions',
            'Basic newsletter'
        ],
        tier: 'OBSERVER'
    },
    {
        name: 'Student',
        price: 9,
        features: [
            'Verified student status',
            'Unlimited research access',
            'Student-only events',
            'Mentorship program access',
            'Portfolio builder tools'
        ],
        recommended: true,
        tier: 'STUDENT'
    },
    {
        name: 'Researcher',
        price: 29,
        features: [
            'Full access to research papers',
            'Submit articles for review',
            'Priority event registration',
            'Direct support for open science',
            'Collaboration tools',
            'API access (Rate limited)'
        ],
        tier: 'RESEARCHER'
    },
    {
        name: 'Visionary',
        price: 99,
        features: [
            'Early access to new features',
            'Exclusive founder workshops',
            'Voting rights on community grants',
            'VIP Event status',
            'Private discord channel',
            'Direct access to Artix team'
        ],
        tier: 'VISIONARY'
    }
];

import { BACKEND_URL } from '../config/client';

const PricingModal = ({ isOpen, onClose }) => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSelectPlan = async (plan) => {
        if (!user) {
            // Normally redirect to login, but for modal just alert
            alert('Please login to subscribe.');
            return;
        }

        // Simplification: In a real app this would trigger Stripe/etc.
        // Here we just mock update.
        if (confirm(`Confirm upgrade to ${plan.name} ($${plan.price}/month)?`)) {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const getCsrfToken = () => {
                    const cookies = document.cookie.split(';');
                    for (let cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name === 'csrf') return value;
                    }
                    return null;
                };

                const res = await fetch(`${BACKEND_URL}/api/subscription/upgrade`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-csrf-token': getCsrfToken() || ''
                    },
                    body: JSON.stringify({ tier: plan.tier }),
                    credentials: 'include'
                });

                const data = await res.json();
                if (res.ok) {
                    await refreshUser(); // Reload user to update tier
                    onClose();
                } else {
                    alert(data.message || 'Error updating subscription');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating subscription');
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-6xl bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8 md:p-12">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold text-white mb-4">Invest in the Future</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                Subscriptions directly fund research grants, high-quality event production, and the development of open-source tools for the community.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PLANS.map((plan) => {
                                const isCurrent = user?.subscriptionTier === plan.tier;
                                return (
                                    <div
                                        key={plan.name}
                                        className={`
                        relative flex flex-col p-6 rounded-2xl border transition-all duration-300
                        ${isCurrent
                                                ? 'bg-white/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                            }
                        `}
                                    >
                                        {isCurrent && (
                                            <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                                                Current
                                            </div>
                                        )}
                                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-3xl font-bold text-white">${plan.price}</span>
                                            <span className="text-gray-500">/month</span>
                                        </div>

                                        <ul className="space-y-4 mb-8 flex-1">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleSelectPlan(plan)}
                                            disabled={isCurrent || loading}
                                            className={`
                                w-full py-3 rounded-xl font-medium transition-all
                                ${isCurrent
                                                    ? 'bg-white/10 text-gray-400 cursor-default'
                                                    : 'bg-white text-black hover:bg-gray-200'
                                                }
                                ${loading ? 'opacity-50 cursor-wait' : ''}
                            `}
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : isCurrent ? 'Current Plan' : 'Choose Plan'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PricingModal;
