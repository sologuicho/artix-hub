import { X, Facebook, Twitter, Linkedin, MessageCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const ShareModal = ({ url, title, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`
  };

  const handleShare = (platform) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Compartir
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Social Media Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-3 p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Facebook className="w-6 h-6" />
              <span className="font-semibold">Facebook</span>
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-3 p-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors"
            >
              <Twitter className="w-6 h-6" />
              <span className="font-semibold">Twitter</span>
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center gap-3 p-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-colors"
            >
              <Linkedin className="w-6 h-6" />
              <span className="font-semibold">LinkedIn</span>
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-3 p-4 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="font-semibold">WhatsApp</span>
            </button>
          </div>

          {/* Copy Link */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enlace
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 glass-input text-gray-900 dark:text-gray-100 text-sm"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;






