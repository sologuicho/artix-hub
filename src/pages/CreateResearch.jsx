import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Upload, X, Plus, Building2, User, ToggleLeft, ToggleRight, Sparkles, ArrowLeft, Image as ImageIcon, GraduationCap } from 'lucide-react';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import CollaboratorSelector from '../components/CollaboratorSelector';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { useAuth } from '../context/AuthContext';

import { BACKEND_URL } from '../config/client';

const CreateResearch = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );

  const researchValidation = useAIValidation('research');
  const [saving, setSaving] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    content: '',
    tags: [],
    documents: [],
    references: [],
    coverUrl: '',
    isCollaborative: false,
  });
  const [collaborators, setCollaborators] = useState([]);

  // Load research data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchResearch = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/research/${id}`, {
            credentials: 'include'
          });
          const data = await response.json();
          if (data.ok && data.research) {
            const research = data.research;
            setFormData({
              title: research.title || '',
              content: research.content || '',
              description: research.description || '',
              category: research.category || '',
              tags: research.tags || [],
              documents: research.documents || [],
              references: research.references || [],
              coverUrl: research.coverUrl || '',
              isCollaborative: research.isCollaborative || false,
            });
            if (research.collaborators) setCollaborators(research.collaborators);
          }
        } catch (error) {
          console.error('Error loading research:', error);
        }
      };
      fetchResearch();
    } else {
      // Load draft logic removed for simplicity in this version, can be re-added
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { compressImage } = await import('../utils/imageCompression');
        const compressedDataUrl = await compressImage(file, 1200, 1200, 0.85);
        setFormData({ ...formData, coverUrl: compressedDataUrl });
      } catch (error) {
        console.error('Error compressing image:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, coverUrl: reader.result });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // AI Assistant Handlers
  const handleInsertText = (text) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n\n' + text
    }));
  };

  const extractMentions = (html) => {
    const mentionRegex = /@(\w+)/g;
    const matches = html.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setValidationMessage('');

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const url = isEditMode ? `${BACKEND_URL}/api/research/${id}` : `${BACKEND_URL}/api/research`;
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
          content: formData.content || '',
          description: formData.description || '',
          category: formData.category || '',
          tags: formData.tags || [],
          documents: formData.documents || [],
          references: formData.references || [],
          coverUrl: formData.coverUrl || null,
          isCollaborative: formData.isCollaborative || collaborators.length > 0,
          publishAsArtixResearch: publishAsArtixResearch && !isEditMode,
          mentions: extractMentions(formData.content)
        })
      });

      const data = await response.json();

      if (data.ok) {
        const researchId = isEditMode ? id : data.research?.id;

        // Invite collaborators if any
        if (!isEditMode && collaborators.length > 0 && researchId) {
          for (const collaborator of collaborators) {
            await fetch(`${BACKEND_URL}/api/research/${researchId}/collaborators`, {
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
        navigate(`/research/${researchId}`);
      } else {
        setValidationMessage(data.message || `Error saving research`);
      }
    } catch (err) {
      setValidationMessage(err.message || 'Error creating research');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumPageLayout>
      {/* Editor Toolbar */}
      <div className="sticky top-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/research')}
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <span className="text-sm font-medium text-gray-400">
            {isEditMode ? 'Edit Research' : 'New Research'}
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
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner Upload */}
            <div className="group relative w-full aspect-[3/1] rounded-3xl overflow-hidden border border-white/10 bg-white/5 transition-all hover:border-blue-500/30">
              {formData.coverUrl ? (
                <>
                  <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer px-6 py-3 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" /> Change Cover
                      <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); setFormData({ ...formData, coverUrl: '' }); }} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                  <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="text-gray-400 text-sm">Add Cover Image</span>
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Title Input */}
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Research Title..."
              className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-gray-700 focus:ring-0 p-0"
            />

            {/* Abstract/Description */}
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Abstract / Short Description..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none transition-colors"
            />

            {/* Content Editor */}
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden min-h-[500px]">
              <RichTextEditorWithMentions
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Write your research paper..."
              />
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" /> Details
              </h3>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Category</label>
                <CategorySelector
                  category={formData.category}
                  onChange={(category) => setFormData({ ...formData, category })}
                  contentType="research"
                  placeholder="Select Field..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Tags</label>
                <TagSelector
                  tags={formData.tags}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  context="research"
                  placeholder="Add tags..."
                />
              </div>
            </div>

            {/* Settings Card */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ToggleRight className="w-4 h-4 text-purple-400" /> Settings
              </h3>

              {/* Collaborative Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Collaborative</span>
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
                    placeholder="Add researchers..."
                  />
                </div>
              )}
            </div>

            {/* Validation Panel */}
            <AIValidationPanel
              status={researchValidation.status}
              result={researchValidation.result}
              error={researchValidation.error}
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
          contentType: 'research',
          category: formData.category
        }}
      />
    </PremiumPageLayout>
  );
};

export default CreateResearch;
