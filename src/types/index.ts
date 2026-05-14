export interface InstagramProfile {
  id: string;
  username: string;
  profile_pic_url?: string;
  full_name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  last_fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface GridPost {
  id: string;
  profile_id: string;
  post_id?: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  original_position: number;
  current_position: number;
  is_planned: boolean;
  is_hidden: boolean;
  likes_count?: number;
  comments_count?: number;
  posted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedLayout {
  id: string;
  profile_id: string;
  name: string;
  description?: string;
  layout_data: {
    posts: GridPost[];
  };
  is_current: boolean;
  created_at: string;
  updated_at: string;
}
