import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Bell, Check, Share2, ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import CollaborationInvitation from '../components/CollaborationInvitation';
import ContentActions from '../components/ContentActions';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';

import { BACKEND_URL } from '../config/client';

const EventView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/events/${id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setEvent(data.event);
        setRegistered(data.event.registrations?.some(r => r.userId === data.event.userId) || false);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/events/${id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok) {
        setRegistered(true);
        setReminderEnabled(true);
      }
    } catch (error) {
      console.error('Error registering for event:', error);
    }
  };

  const handleToggleReminder = async (reminderType) => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      if (reminderEnabled) {
        const response = await fetch(`${BACKEND_URL}/api/reminders/events/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken() || ''
          },
          credentials: 'include',
          body: JSON.stringify({ reminderType })
        });
        const data = await response.json();
        if (data.ok) {
          setReminderEnabled(false);
        }
      } else {
        const response = await fetch(`${BACKEND_URL}/api/reminders/events/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken() || ''
          },
          credentials: 'include',
          body: JSON.stringify({ reminderType: reminderType || 'day_before' })
        });
        const data = await response.json();
        if (data.ok) {
          setReminderEnabled(true);
        }
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PremiumPageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PremiumPageLayout>
    );
  }

  if (!event) {
    return (
      <PremiumPageLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Event not found</h2>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Back to Events
          </button>
        </div>
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate('/events')}
        className="fixed top-24 left-8 z-30 p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/40 transition-all group hidden xl:block"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </button>

      <div className="max-w-6xl mx-auto pb-20">
        {/* Banner Section */}
        <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-10 shadow-2xl shadow-blue-900/20 animate-fade-in group">
          {event.bannerUrl ? (
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />

          {/* Event Header Info */}
          <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-semibold backdrop-blur-md">
                {event.type}
              </span>
              {event.date && (
                <span className="flex items-center gap-2 text-gray-300 text-sm font-medium px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <Calendar className="w-4 h-4" /> {formatDate(event.date)}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight max-w-4xl tracking-tight">
              {event.title}
            </h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[1px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    {event.creator?.avatar ? (
                      <img src={event.creator.avatar} alt={event.creator.username} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium">Hosted by</p>
                  <p className="text-blue-400 text-sm">
                    {event.creator?.name || event.creator?.username || 'Artix Team'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                About Event
              </h2>
              <div className="prose prose-lg prose-invert max-w-none text-gray-300 leading-relaxed">
                <p className="whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" /> Location
                </h2>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{event.location}</h3>
                    <p className="text-sm text-gray-500">Check map for details</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Register Card */}
              <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-white/10 shadow-xl shadow-black/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Registration</h3>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                    {event.registrations?.length || 0} Joined
                  </span>
                </div>

                {!registered ? (
                  <button
                    onClick={handleRegister}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Join Event
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-green-400 font-bold text-sm">You're registered!</p>
                        <p className="text-green-400/60 text-xs">See you there.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleToggleReminder('day_before')}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1 ${reminderEnabled ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        <Bell className="w-4 h-4" /> 1 Day Before
                      </button>
                      <button
                        onClick={() => handleToggleReminder('morning_of')}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1 ${reminderEnabled ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        <Bell className="w-4 h-4" /> Morning Of
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Time</p>
                    <p className="text-white font-medium">{event.time || 'TBA'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Date</p>
                    <p className="text-white font-medium">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 font-medium transition-all flex items-center justify-center gap-2 group"
              >
                <Share2 className="w-4 h-4 group-hover:text-white" /> Share Event
              </button>

              {/* Owner Actions */}
              {isAuthenticated() && (
                <div className="flex justify-end">
                  <ContentActions
                    type="event"
                    itemId={event.id}
                    authorId={event.creatorId || event.creator?.id}
                    author={event.creator}
                    onDelete={() => navigate('/events')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {shareModal && (
        <ShareModal
          url={window.location.href}
          title={event.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </PremiumPageLayout>
  );
};

export default EventView;
