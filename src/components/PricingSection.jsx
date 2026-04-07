import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

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

const PricingSection = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSelectPlan = async (plan) => {
        if (!user) {
            window.location.href = '/auth'; // Redirect to login
            return;
        }

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
                    await refreshUser();
                    alert('Plan updated successfully!');
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

    return (
        <section className="py-24 bg-black text-white relative overflow-hidden" id="pricing">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/2 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-left mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Subscription Plans</h2>
                    <p className="text-xl text-gray-400 max-w-2xl">
                        Choose the plan that fits your journey in the Artix ecosystem.
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
                                        ? 'bg-[#111] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]'
                                        : 'bg-[#050505] border-white/10 hover:border-white/20 hover:-translate-y-1'
                                    }
                    `}
                            >
                                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                                    <span className="text-sm text-gray-500 font-medium">/month</span>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                            <span className="leading-snug">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={isCurrent || loading}
                                    className={`
                            w-full py-3 rounded-xl font-medium text-sm transition-all
                            ${isCurrent
                                            ? 'bg-white/10 text-gray-400 cursor-default border border-white/5'
                                            : 'bg-[#1a1a1a] text-white hover:bg-white hover:text-black border border-white/10 hover:border-white'
                                        }
                            ${loading ? 'opacity-50 cursor-wait' : ''}
                        `}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isCurrent ? 'Current Plan' : 'Choose Plan'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    );
};

export default PricingSection;
