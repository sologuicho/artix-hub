import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Upload, X, Plus, Sparkles, Building2, User, ToggleLeft, ToggleRight, LayoutTemplate, ArrowLeft } from 'lucide-react';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import CollaboratorSelector from '../components/CollaboratorSelector';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import { useAuth } from '../context/AuthContext';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import clsx from 'clsx'; // Make sure clsx is imported, or remove if not used

import { BACKEND_URL } from '../config/client';

const CreateArticle = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );
  const articleValidation = useAIValidation('article');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    category: '',
    tags: [],
    references: [],
    coverUrl: '',
    status: 'draft',
    isCollaborative: false,
  });
  const [collaborators, setCollaborators] = useState([]);

  // ... (Data loading logic preserved)
  useEffect(() => {
    if (isEditMode && id) {
      const fetchArticle = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/articles/${id}`, { credentials: 'include' });
          const data = await response.json();
          if (data.ok && data.article) {
            const article = data.article;
            setFormData({
              title: article.title || '',
              content: article.content || '',
              description: article.description || '',
              category: article.category || '',
              tags: article.tags || [],
              references: article.references || [],
              coverUrl: article.coverUrl || '',
              status: article.status || 'draft',
              isCollaborative: article.isCollaborative || false,
            });
          }
        } catch (error) { console.error('Error loading article:', error); }
      };
      fetchArticle();
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, coverUrl: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleTextReplace = (newText) => {
    setFormData({ ...formData, content: newText });
    setSelectedText('');
  };

  const handleInsertText = (text) => {
    setFormData({ ...formData, content: formData.content + '\n\n' + text });
    setSelectedText('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationMessage('');

    try {
      // Logic to get CSRF
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const url = isEditMode ? `${BACKEND_URL}/api/articles/${id}` : `${BACKEND_URL}/api/articles`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          publishAsArtixResearch,
          status: isEditMode ? formData.status : 'published' // Simplification
        })
      });

      const data = await response.json();
      if (data.ok) {
        navigate(`/articles/${data.article?.id || id}`);
      } else {
        setValidationMessage(data.message || 'Error saving article');
      }
    } catch (err) {
      console.error(err);
      setValidationMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PremiumPageLayout>
      <div className="flex gap-8 items-start sticky top-0 z-30 pt-4 pb-6 bg-[#030303]/80 backdrop-blur-md">
        <button onClick={() => navigate('/articles')} className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white leading-none">
            {isEditMode ? 'Edit Article' : 'Create Article'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Draft saved locally</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
            className={`p-2 rounded-xl transition-all ${isAIPanelOpen ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 pb-20">
        {/* Editor Column */}
        <div className="space-y-8">
          {/* Cover Image */}
          <div className="group relative aspect-[21/9] rounded-2xl bg-white/5 border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer hover:border-white/20 transition-colors">
            {formData.coverUrl ? (
              <>
                <img src={formData.coverUrl} className="w-full h-full object-cover object-center" />
                <button onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, coverUrl: '' }) }} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="px-4 py-2 bg-black/60 rounded-full text-white text-sm backdrop-blur-md border border-white/20">Change Cover</span>
                </div>
              </>
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2 group-hover:text-white transition-colors" />
                <span className="text-sm text-gray-500 group-hover:text-gray-300">Add Cover Image</span>
              </div>
            )}
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCoverChange} />
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Article Title..."
              className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-gray-600 focus:ring-0 px-0"
            />
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add a short description or subtitle..."
              rows={2}
              className="w-full bg-transparent border-none text-xl text-gray-400 placeholder-gray-700 focus:ring-0 px-0 resize-none"
            />
          </div>

          {/* Rich Editor */}
          <div className="min-h-[500px] border border-white/5 rounded-2xl bg-white/[0.02] p-6 focus-within:border-white/10 transition-colors">
            <RichTextEditorWithMentions
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
              placeholder="Tell your story..."
            />
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          {/* AI Assistant Overlay */}
          <AIAssistantOverlay
            isOpen={isAIPanelOpen}
            onClose={() => setIsAIPanelOpen(false)}
            onInsertText={handleInsertText}
            contextData={{
              selectedText,
              category: formData.category,
              contentType: 'article'
            }}
          />

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-gray-400" />
              Settings
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Category</label>
              <CategorySelector
                category={formData.category}
                onChange={(cat) => setFormData({ ...formData, category: cat })}
                contentType="article"
                placeholder="Select category..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tags</label>
              <TagSelector
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
                context="articles"
                placeholder="Add tags..."
              />
            </div>

            {isAdmin && !isEditMode && (
              <div className="pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPublishAsArtixResearch(!publishAsArtixResearch)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm text-gray-300">
                    {publishAsArtixResearch ? 'Publishing as Artix' : 'Publishing as You'}
                  </span>
                  {publishAsArtixResearch ? <ToggleRight className="text-purple-500" /> : <ToggleLeft className="text-gray-500" />}
                </button>
              </div>
            )}
          </div>

          {/* Validation Status */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
            <h3 className="font-semibold text-white mb-4">Quality Check</h3>
            <AIValidationPanel
              status={articleValidation.status}
              result={articleValidation.result}
              error={articleValidation.error}
            />
          </div>
        </div>
      </div>

    </PremiumPageLayout>
  );
};

export default CreateArticle;
