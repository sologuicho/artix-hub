import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Upload, Calendar, MapPin, Clock, X, Building2, User, ToggleLeft, ToggleRight, Sparkles, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import CollaboratorSelector from '../components/CollaboratorSelector';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const CreateEvent = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );

  const eventValidation = useAIValidation('event');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: '',
    tags: [],
    bannerUrl: '',
    isCollaborative: false,
  });
  const [collaborators, setCollaborators] = useState([]);

  // Load event data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchEvent = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/events/${id}`, {
            credentials: 'include'
          });
          const data = await response.json();
          if (data.ok && data.event) {
            const event = data.event;
            const eventDate = new Date(event.date);
            setFormData({
              title: event.title || '',
              description: event.description || '',
              date: eventDate.toISOString().split('T')[0] || '',
              time: event.time || '',
              location: event.location || '',
              type: event.type || '',
              tags: event.tags || [],
              bannerUrl: event.bannerUrl || '',
              isCollaborative: event.isCollaborative || false,
            });
            if (event.collaborators) setCollaborators(event.collaborators);
          }
        } catch (error) {
          console.error('Error loading event:', error);
        }
      };
      fetchEvent();
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { compressImage } = await import('../utils/imageCompression');
        const compressedDataUrl = await compressImage(file, 1200, 1200, 0.85);
        setFormData({ ...formData, bannerUrl: compressedDataUrl });
      } catch (error) {
        console.error('Error compressing image:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, bannerUrl: reader.result });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // AI Assistant Handlers
  const handleInsertText = (text) => {
    setFormData(prev => ({
      ...prev,
      description: prev.description + '\n\n' + text
    }));
  };

  const extractMentions = (html) => {
    const mentionRegex = /@(\w+)/g;
    const matches = html.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationMessage('');
    setIsSubmitting(true);

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const url = isEditMode ? `${BACKEND_URL}/api/events/${id}` : `${BACKEND_URL}/api/events`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title || '',
          description: formData.description || '',
          date: new Date(formData.date + 'T' + (formData.time || '00:00')).toISOString(),
          time: formData.time || '',
          location: formData.location || '',
          type: formData.type || '',
          tags: formData.tags || [],
          bannerUrl: formData.bannerUrl || null,
          isCollaborative: formData.isCollaborative || collaborators.length > 0,
          publishAsArtixResearch: publishAsArtixResearch && !isEditMode,
          mentions: extractMentions(formData.description)
        })
      });

      const data = await response.json();

      if (data.ok) {
        const eventId = isEditMode ? id : data.event?.id;

        // Handle collaborators
        if (!isEditMode && collaborators.length > 0 && eventId) {
          for (const collaborator of collaborators) {
            await fetch(`${BACKEND_URL}/api/events/${eventId}/collaborators`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': getCsrfToken() || ''
              },
              credentials: 'include',
              body: JSON.stringify({
                userId: collaborator.id,
                role: 'collaborator'
              })
            });
          }
        }
        navigate(`/events/${eventId}`);
      } else {
        setValidationMessage(data.message || 'Error saving event');
      }
    } catch (err) {
      setValidationMessage(err.message || 'Error submitting event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PremiumPageLayout>
      {/* Editor Toolbar */}
      <div className="sticky top-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/events')}
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <span className="text-sm font-medium text-gray-400">
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAIPanelOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI Assistant</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner Upload */}
            <div className="group relative w-full aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 bg-white/5 transition-all hover:border-blue-500/30">
              {formData.bannerUrl ? (
                <>
                  <img src={formData.bannerUrl} alt="Event Banner" className="w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer px-6 py-3 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" /> Change Banner
                      <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
                    </label>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setFormData({ ...formData, bannerUrl: '' }); }}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-gray-500 group-hover:text-blue-400" />
                  </div>
                  <span className="text-gray-400 font-medium group-hover:text-white">Upload Event Banner</span>
                  <span className="text-sm text-gray-600 mt-2">1200x600 recommended</span>
                  <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Title Input */}
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Event Title..."
              className="w-full bg-transparent border-none text-4xl md:text-5xl font-bold text-white placeholder-gray-700 focus:ring-0 p-0"
            />

            {/* Description Editor */}
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
              <RichTextEditorWithMentions
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Describe your event details..."
              />
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Event Details Card */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" /> Event Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Date & Time</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 transition-colors"
                    />
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Add location or link..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Type</label>
                  <CategorySelector
                    category={formData.type}
                    onChange={(type) => setFormData({ ...formData, type })}
                    contentType="event"
                    placeholder="Select Type..."
                  />
                </div>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ToggleRight className="w-4 h-4 text-purple-400" /> Settings
              </h3>

              {/* Collaborative Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Collaborative Event</span>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, isCollaborative: !prev.isCollaborative }))}
                  className={`w-10 h-6 rounded-full transition-colors relative ${formData.isCollaborative ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isCollaborative ? 'translate-x-4' : ''}`} />
                </button>
              </div>

              {formData.isCollaborative && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Collaborators</label>
                  <CollaboratorSelector
                    selectedCollaborators={collaborators}
                    onSelect={(user) => setCollaborators([...collaborators, user])}
                    onRemove={(userId) => setCollaborators(collaborators.filter(c => c.id !== userId))}
                    placeholder="Add people..."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Tags</label>
                <TagSelector
                  tags={formData.tags}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  context="events"
                  placeholder="Add tags..."
                />
              </div>
            </div>

            {/* Validation Panel */}
            <AIValidationPanel
              status={eventValidation.status}
              result={eventValidation.result}
              error={eventValidation.error}
            />

            {validationMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {validationMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Overlay */}
      <AIAssistantOverlay
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        onInsertText={handleInsertText}
        contextData={{
          title: formData.title,
          contentType: 'event',
          type: formData.type
        }}
      />
    </PremiumPageLayout>
  );
};

export default CreateEvent;
