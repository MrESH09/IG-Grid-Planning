import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface SaveLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export function SaveLayoutModal({ isOpen, onClose, onSave }: SaveLayoutModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim());
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Save Layout</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layout Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Theme 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this layout..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}
