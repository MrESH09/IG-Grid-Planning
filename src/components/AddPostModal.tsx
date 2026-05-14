import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (imageData: string, caption: string) => void;
}

export function AddPostModal({ isOpen, onClose, onAdd }: AddPostModalProps) {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!imagePreview) return;
    onAdd(imagePreview, caption);
    setImagePreview('');
    setCaption('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Post</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload size={48} className="text-gray-400 mb-2" />
              <p className="text-gray-600 text-center mb-1">Click to upload image</p>
              <p className="text-sm text-gray-400">JPG, PNG, or GIF</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full rounded-lg"
              />
              <button
                onClick={() => setImagePreview('')}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!imagePreview}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add to Grid
          </button>
        </div>
      </div>
    </div>
  );
}
