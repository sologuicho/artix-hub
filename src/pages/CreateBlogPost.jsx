import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Upload, Image as ImageIcon, Video, FileText, X, Building2, User, ToggleLeft, ToggleRight, Sparkles, ArrowLeft } from 'lucide-react';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const CreateBlogPost = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );
  const [validationMessage, setValidationMessage] = useState('');
  const blogValidation = useAIValidation('blog');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    tags: [],
  });
  const [coverUrl, setCoverUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [documents, setDocuments] = useState([]);

  // Load post data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchPost = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/blog/${id}`, {
            credentials: 'include'
          });
          const data = await response.json();
          if (data.ok && data.post) {
            const post = data.post;
            setFormData({
              title: post.title || '',
              category: post.category || 'General',
              content: post.content || '',
              tags: post.tags || [],
            });
            setCoverUrl(post.coverUrl || '');
            setImageUrl(post.imageUrl || '');
            setVideoUrl(post.videoUrl || '');
            setDocuments(post.documents ? post.documents.map(url => ({ url })) : []);
          }
        } catch (error) {
          console.error('Error loading post:', error);
        }
      };
      fetchPost();
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
        setCoverUrl(compressedDataUrl);
      } catch (error) {
        console.error('Error compressing image:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCoverUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { compressImage } = await import('../utils/imageCompression');
        const compressedDataUrl = await compressImage(file, 1200, 1200, 0.85);
        setImageUrl(compressedDataUrl);
      } catch (error) {
        console.error('Error compressing image:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrl(reader.result);
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
    if (!formData.content.trim() && !coverUrl && !imageUrl && !videoUrl && documents.length === 0) {
      setValidationMessage('Debes agregar contenido o al menos un archivo');
      return;
    }

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

      const extractedMentions = extractMentions(formData.content);
      const documentUrls = documents.map(doc => doc.url);

      const url = isEditMode ? `${BACKEND_URL}/api/blog/${id}` : `${BACKEND_URL}/api/blog`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title || null,
          content: formData.content.trim(),
          category: formData.category || 'General',
          tags: formData.tags || [],
          coverUrl: coverUrl || null,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          documents: documentUrls,
          mentions: extractedMentions,
          publishAsArtixResearch: publishAsArtixResearch && !isEditMode
        })
      });

      const data = await response.json();
      if (data.ok) {
        navigate('/blog');
      } else {
        setValidationMessage(data.message || 'Error creating post');
      }
    } catch (error) {
      setValidationMessage(error.message || 'Error saving post');
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
            onClick={() => navigate('/blog')}
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <span className="text-sm font-medium text-gray-400">
            {isEditMode ? 'Edit Post' : 'New Post'}
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

      <div className="max-w-4xl mx-auto pb-20">
        {/* Admin Author Toggle */}
        {isAdmin && !isEditMode && (
          <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${publishAsArtixResearch ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {publishAsArtixResearch ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-white font-medium">Posting as {publishAsArtixResearch ? 'Artix Research' : (user?.name || user?.username)}</p>
                <p className="text-sm text-gray-400">Post author will be visible as chosen</p>
              </div>
            </div>
            <button
              onClick={() => setPublishAsArtixResearch(!publishAsArtixResearch)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              {publishAsArtixResearch ? <ToggleRight className="w-5 h-5 text-purple-400" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Main Editor */}
        <div className="space-y-6">
          {/* Title */}
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Post Title (Optional)"
            className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-gray-700 focus:ring-0 p-0"
          />

          {/* Media Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cover Image Upload */}
            <div className="group relative aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-blue-500/30 transition-colors">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-400">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-xs">Cover Image</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              {coverUrl && (
                <button onClick={(e) => { e.preventDefault(); setCoverUrl(''); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Content Image Upload */}
            <div className="group relative aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-blue-500/30 transition-colors">
              {imageUrl ? (
                <img src={imageUrl} alt="Content" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-400">
                  <ImageIcon className="w-6 h-6 mb-2" />
                  <span className="text-xs">Content Image</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              {imageUrl && (
                <button onClick={(e) => { e.preventDefault(); setImageUrl(''); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Video URL Input - Simplified visual */}
            <div className="relative aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-blue-500/30 transition-colors p-4 flex flex-col justify-center">
              <div className="flex flex-col items-center text-gray-500 mb-3">
                <Video className="w-6 h-6 mb-2" />
                <span className="text-xs">Video URL</span>
              </div>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
            <RichTextEditorWithMentions
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Write something amazing..."
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-white/5 border border-white/5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Category</label>
              <CategorySelector
                category={formData.category}
                onChange={(category) => setFormData({ ...formData, category })}
                contentType="blog"
                placeholder="Select category..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Tags</label>
              <TagSelector
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
                context="blog"
                placeholder="Add tags..."
              />
            </div>
          </div>

          {/* Validation Messages */}
          {validationMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {validationMessage}
            </div>
          )}
        </div>
      </div>

      {/* AI Overlay */}
      <AIAssistantOverlay
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        onInsertText={handleInsertText}
        contextData={{
          title: formData.title,
          contentType: 'blog',
          category: formData.category
        }}
      />
    </PremiumPageLayout>
  );
};

export default CreateBlogPost;
