import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { GridPost, InstagramProfile, SavedLayout } from './types';
import { GridDisplay } from './components/GridDisplay';
import { AddPostModal } from './components/AddPostModal';
import { SaveLayoutModal } from './components/SaveLayoutModal';
import { Search, Plus, CreditCard as Edit3, Save, RotateCcw, Loader2, Instagram, Layers, Check, Trash2 } from 'lucide-react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        showAlert: (message: string) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
      };
    };
  }
}

function App() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [posts, setPosts] = useState<GridPost[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [visibleGridSize, setVisibleGridSize] = useState(9);
  const [deletingLayoutId, setDeletingLayoutId] = useState<string | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const fetchProfile = async () => {
    if (!username.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-instagram-profile?username=${username}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setProfile(data.profile);

      const { data: postsData } = await supabase
        .from('grid_posts')
        .select('*')
        .eq('profile_id', data.profile.id)
        .order('current_position', { ascending: true });

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
      alert('Failed to fetch profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedLayouts = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('saved_layouts')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    setSavedLayouts(data || []);
    setShowLayouts(true);
  };

  const handleReorder = (reorderedPosts: GridPost[]) => {
    setPosts(reorderedPosts);
    setHasChanges(true);
  };

  const handleToggleHidden = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const updatedPost = { ...post, is_hidden: !post.is_hidden };

    await supabase
      .from('grid_posts')
      .update({ is_hidden: updatedPost.is_hidden })
      .eq('id', postId);

    setPosts(posts.map((p) => (p.id === postId ? updatedPost : p)));
    setHasChanges(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showConfirm('Delete this planned post?', async (confirmed) => {
        if (confirmed) {
          await deletePost(postId);
        }
      });
    } else {
      if (confirm('Delete this planned post?')) {
        await deletePost(postId);
      }
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await supabase.from('grid_posts').delete().eq('id', postId);
      setPosts(posts.filter((p) => p.id !== postId));
      setHasChanges(true);

      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Post deleted!');
      } else {
        alert('Post deleted!');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Failed to delete post');
      } else {
        alert('Failed to delete post');
      }
    }
  };

  const handleAddPost = async (imageData: string, caption: string) => {
    if (!profile) return;

    const newPosition = Math.max(...posts.map((p) => p.current_position), -1) + 1;

    const { data } = await supabase
      .from('grid_posts')
      .insert({
        profile_id: profile.id,
        image_url: imageData,
        caption,
        original_position: newPosition,
        current_position: newPosition,
        is_planned: true,
        is_hidden: false,
      })
      .select()
      .single();

    if (data) {
      setPosts([...posts, data]);
      setHasChanges(true);
    }
  };

  const saveChanges = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      for (const post of posts) {
        await supabase
          .from('grid_posts')
          .update({
            current_position: post.current_position,
            is_hidden: post.is_hidden,
          })
          .eq('id', post.id);
      }

      setHasChanges(false);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Changes saved successfully!');
      } else {
        alert('Changes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLayout = async (name: string, description: string) => {
    if (!profile) return;

    await supabase.from('saved_layouts').insert({
      profile_id: profile.id,
      name,
      description,
      layout_data: { posts },
      is_current: false,
    });

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert('Layout saved!');
    } else {
      alert('Layout saved!');
    }
  };

  const loadLayout = async (layout: SavedLayout) => {
    const layoutPosts = layout.layout_data.posts;

    for (const post of layoutPosts) {
      await supabase
        .from('grid_posts')
        .update({
          current_position: post.current_position,
          is_hidden: post.is_hidden,
        })
        .eq('id', post.id);
    }

    setPosts(layoutPosts);
    setShowLayouts(false);
    setHasChanges(false);

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert('Layout loaded!');
    } else {
      alert('Layout loaded!');
    }
  };

  const handleDeleteLayout = async (layoutId: string) => {
    const confirmDelete = window.Telegram?.WebApp
      ? await new Promise<boolean>((resolve) => {
          window.Telegram!.WebApp.showConfirm('Delete this layout?', resolve);
        })
      : confirm('Delete this layout?');

    if (!confirmDelete) return;

    setDeletingLayoutId(layoutId);
    try {
      await supabase.from('saved_layouts').delete().eq('id', layoutId);
      setSavedLayouts(savedLayouts.filter((l) => l.id !== layoutId));

      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Layout deleted!');
      } else {
        alert('Layout deleted!');
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Failed to delete layout');
      } else {
        alert('Failed to delete layout');
      }
    } finally {
      setDeletingLayoutId(null);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage =
      (element.scrollHeight - element.clientHeight - element.scrollTop) /
      element.clientHeight;

    if (scrollPercentage < 1) {
      setVisibleGridSize((prev) => prev + 3);
    }
  };

  const resetToOriginal = async () => {
    if (!profile) return;

    const confirmReset = window.Telegram?.WebApp
      ? await new Promise<boolean>((resolve) => {
          window.Telegram!.WebApp.showConfirm(
            'Reset to original Instagram order?',
            resolve
          );
        })
      : confirm('Reset to original Instagram order?');

    if (!confirmReset) return;

    const resetPosts = posts.map((post) => ({
      ...post,
      current_position: post.original_position,
      is_hidden: false,
    }));

    for (const post of resetPosts) {
      await supabase
        .from('grid_posts')
        .update({
          current_position: post.current_position,
          is_hidden: post.is_hidden,
        })
        .eq('id', post.id);
    }

    setPosts(resetPosts);
    setHasChanges(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl mb-4">
              <Instagram className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Instagram Grid Planner
            </h1>
            <p className="text-gray-600">
              Plan your perfect Instagram feed layout
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchProfile()}
                  placeholder="username"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
              </div>
            </div>

            <button
              onClick={fetchProfile}
              disabled={loading || !username.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Loading...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Load Profile
                </>
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Enter any public Instagram username to get started</p>
          </div>
        </div>
      </div>
    );
  }

  if (showLayouts) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <button
              onClick={() => setShowLayouts(false)}
              className="text-pink-600 font-medium"
            >
              Back to Grid
            </button>
            <h2 className="text-lg font-bold text-center mt-2">Saved Layouts</h2>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {savedLayouts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Layers size={48} className="mx-auto mb-4 opacity-50" />
              <p>No saved layouts yet</p>
              <p className="text-sm">Save your current layout to access it later</p>
            </div>
          ) : (
            savedLayouts.map((layout) => (
              <div
                key={layout.id}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    onClick={() => loadLayout(layout)}
                    className="flex-1 cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900">{layout.name}</h3>
                    {layout.description && (
                      <p className="text-sm text-gray-600 mt-1">{layout.description}</p>
                    )}
                  </div>
                  {layout.is_current && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 ml-2">
                      <Check size={12} />
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {new Date(layout.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleDeleteLayout(layout.id)}
                    disabled={deletingLayoutId === layout.id}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 disabled:opacity-50 text-sm font-medium transition-opacity flex items-center gap-1"
                  >
                    {deletingLayoutId === layout.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            {profile.profile_pic_url && (
              <img
                src={profile.profile_pic_url}
                alt={profile.username}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 truncate">@{profile.username}</h2>
              {profile.full_name && (
                <p className="text-sm text-gray-600 truncate">{profile.full_name}</p>
              )}
            </div>
            <button
              onClick={() => {
                setProfile(null);
                setPosts([]);
                setEditMode(false);
                setHasChanges(false);
              }}
              className="text-sm text-pink-600 font-medium"
            >
              Change
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                editMode
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit3 size={16} />
              {editMode ? 'Editing' : 'Edit Mode'}
            </button>

            {editMode && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium whitespace-nowrap hover:bg-blue-600 transition-colors"
                >
                  <Plus size={16} />
                  Add Post
                </button>

                {hasChanges && (
                  <button
                    onClick={saveChanges}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium whitespace-nowrap hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
                  </button>
                )}

                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium whitespace-nowrap hover:bg-purple-600 transition-colors"
                >
                  <Layers size={16} />
                  Save Layout
                </button>

                <button
                  onClick={resetToOriginal}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium whitespace-nowrap hover:bg-orange-600 transition-colors"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </>
            )}

            <button
              onClick={loadSavedLayouts}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              <Layers size={16} />
              Layouts
            </button>
          </div>
        </div>
      </div>

      <div
        className="max-w-2xl mx-auto h-screen overflow-y-auto"
        onScroll={handleScroll}
      >
        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 px-4">
            <Instagram size={48} className="mx-auto mb-4 opacity-50" />
            <p>No posts found</p>
            <p className="text-sm">Add new posts to start planning your grid</p>
          </div>
        ) : (
          <GridDisplay
            posts={posts.slice(0, visibleGridSize)}
            onReorder={handleReorder}
            onToggleHidden={handleToggleHidden}
            onDelete={handleDeletePost}
            editMode={editMode}
          />
        )}
      </div>

      <AddPostModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPost}
      />

      <SaveLayoutModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveLayout}
      />
    </div>
  );
}

export default App;
