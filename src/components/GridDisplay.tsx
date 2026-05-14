import { useState } from 'react';
import { GridPost } from '../types';
import { Eye, EyeOff, GripVertical, Trash2, Heart, MessageCircle } from 'lucide-react';

interface GridDisplayProps {
  posts: GridPost[];
  onReorder: (posts: GridPost[]) => void;
  onToggleHidden: (postId: string) => void;
  onDelete: (postId: string) => void;
  editMode: boolean;
}

export function GridDisplay({ posts, onReorder, onToggleHidden, onDelete, editMode }: GridDisplayProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const visiblePosts = editMode ? posts : posts.filter(p => !p.is_hidden);
  const sortedPosts = [...visiblePosts].sort((a, b) => a.current_position - b.current_position);

  const handleDragStart = (index: number) => {
    if (!editMode) return;
    setDraggedItem(index);
  };

  const handleDragEnter = (index: number) => {
    if (!editMode || draggedItem === null) return;
    setDragOverItem(index);
  };

  const handleDragEnd = () => {
    if (!editMode || draggedItem === null || dragOverItem === null) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newPosts = [...sortedPosts];
    const draggedPost = newPosts[draggedItem];
    newPosts.splice(draggedItem, 1);
    newPosts.splice(dragOverItem, 0, draggedPost);

    const reorderedPosts = newPosts.map((post, index) => ({
      ...post,
      current_position: index,
    }));

    onReorder(reorderedPosts);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="grid grid-cols-3 gap-1 bg-black">
      {sortedPosts.map((post, index) => (
        <div
          key={post.id}
          draggable={editMode}
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          className={`relative aspect-square bg-gray-200 overflow-hidden ${
            editMode ? 'cursor-move' : ''
          } ${draggedItem === index ? 'opacity-50' : ''} ${
            dragOverItem === index ? 'ring-2 ring-blue-500' : ''
          } ${post.is_hidden ? 'opacity-40' : ''}`}
        >
          <img
            src={post.thumbnail_url || post.image_url}
            alt={post.caption || 'Instagram post'}
            className="w-full h-full object-cover"
          />

          {!post.is_planned && (
            <div className="absolute top-1 left-1 flex gap-1 text-white text-xs">
              {post.likes_count !== undefined && (
                <div className="flex items-center gap-0.5 bg-black/60 px-1 py-0.5 rounded">
                  <Heart size={10} />
                  <span>{post.likes_count > 999 ? `${(post.likes_count / 1000).toFixed(1)}k` : post.likes_count}</span>
                </div>
              )}
              {post.comments_count !== undefined && (
                <div className="flex items-center gap-0.5 bg-black/60 px-1 py-0.5 rounded">
                  <MessageCircle size={10} />
                  <span>{post.comments_count > 999 ? `${(post.comments_count / 1000).toFixed(1)}k` : post.comments_count}</span>
                </div>
              )}
            </div>
          )}

          {post.is_planned && (
            <div className="absolute top-1 left-1">
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                NEW
              </span>
            </div>
          )}

          {editMode && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex gap-2">
                <button
                  onClick={() => onToggleHidden(post.id)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title={post.is_hidden ? 'Show post' : 'Hide post'}
                >
                  {post.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                {post.is_planned && (
                  <button
                    onClick={() => onDelete(post.id)}
                    className="p-2 bg-red-500/90 text-white rounded-full hover:bg-red-500 transition-colors"
                    title="Delete planned post"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="absolute bottom-1 right-1">
                <GripVertical size={20} className="text-white drop-shadow-lg" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
