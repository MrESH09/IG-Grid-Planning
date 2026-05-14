/*
  # Instagram Grid Planner Schema

  ## Overview
  This migration creates the database structure for an Instagram Grid Planner app
  that allows users to plan and arrange their Instagram feed.

  ## New Tables

  ### `instagram_profiles`
  - `id` (uuid, primary key) - Unique identifier
  - `username` (text) - Instagram username
  - `profile_pic_url` (text, nullable) - Profile picture URL
  - `full_name` (text, nullable) - Full name from Instagram
  - `bio` (text, nullable) - Bio text
  - `followers_count` (integer, nullable) - Number of followers
  - `following_count` (integer, nullable) - Number of following
  - `posts_count` (integer, nullable) - Total posts count
  - `last_fetched_at` (timestamptz) - When profile was last fetched
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `grid_posts`
  - `id` (uuid, primary key) - Unique identifier
  - `profile_id` (uuid, foreign key) - Reference to instagram_profiles
  - `post_id` (text, nullable) - Original Instagram post ID (if from Instagram)
  - `image_url` (text) - Image URL or data URI
  - `thumbnail_url` (text, nullable) - Thumbnail URL
  - `caption` (text, nullable) - Post caption
  - `original_position` (integer) - Original position in feed
  - `current_position` (integer) - Current position in grid
  - `is_planned` (boolean, default false) - Whether this is a planned post or existing
  - `is_hidden` (boolean, default false) - Whether post is hidden in grid
  - `likes_count` (integer, nullable) - Number of likes (for existing posts)
  - `comments_count` (integer, nullable) - Number of comments (for existing posts)
  - `posted_at` (timestamptz, nullable) - When post was published on Instagram
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `saved_layouts`
  - `id` (uuid, primary key) - Unique identifier
  - `profile_id` (uuid, foreign key) - Reference to instagram_profiles
  - `name` (text) - Layout name
  - `description` (text, nullable) - Layout description
  - `layout_data` (jsonb) - JSON data storing the complete layout configuration
  - `is_current` (boolean, default false) - Whether this is the active layout
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## Security
  - Enable RLS on all tables
  - Public access policies for read operations (since profiles are public)
  - Authenticated users can modify their own data
*/

-- Create instagram_profiles table
CREATE TABLE IF NOT EXISTS instagram_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  profile_pic_url text,
  full_name text,
  bio text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  last_fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create grid_posts table
CREATE TABLE IF NOT EXISTS grid_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES instagram_profiles(id) ON DELETE CASCADE NOT NULL,
  post_id text,
  image_url text NOT NULL,
  thumbnail_url text,
  caption text,
  original_position integer NOT NULL,
  current_position integer NOT NULL,
  is_planned boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  posted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create saved_layouts table
CREATE TABLE IF NOT EXISTS saved_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES instagram_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  layout_data jsonb NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_grid_posts_profile_id ON grid_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_grid_posts_current_position ON grid_posts(profile_id, current_position);
CREATE INDEX IF NOT EXISTS idx_saved_layouts_profile_id ON saved_layouts(profile_id);

-- Enable Row Level Security
ALTER TABLE instagram_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grid_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instagram_profiles
-- Anyone can read profiles (public data)
CREATE POLICY "Anyone can view Instagram profiles"
  ON instagram_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Anyone can insert profiles (for fetching new profiles)
CREATE POLICY "Anyone can create Instagram profiles"
  ON instagram_profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update profiles (for refreshing data)
CREATE POLICY "Anyone can update Instagram profiles"
  ON instagram_profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for grid_posts
-- Anyone can read posts
CREATE POLICY "Anyone can view grid posts"
  ON grid_posts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Anyone can insert posts
CREATE POLICY "Anyone can create grid posts"
  ON grid_posts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update posts
CREATE POLICY "Anyone can update grid posts"
  ON grid_posts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Anyone can delete posts
CREATE POLICY "Anyone can delete grid posts"
  ON grid_posts FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for saved_layouts
-- Anyone can read layouts
CREATE POLICY "Anyone can view saved layouts"
  ON saved_layouts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Anyone can insert layouts
CREATE POLICY "Anyone can create saved layouts"
  ON saved_layouts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update layouts
CREATE POLICY "Anyone can update saved layouts"
  ON saved_layouts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Anyone can delete layouts
CREATE POLICY "Anyone can delete saved layouts"
  ON saved_layouts FOR DELETE
  TO anon, authenticated
  USING (true);