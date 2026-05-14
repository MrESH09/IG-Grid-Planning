import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InstagramPost {
  id: string;
  image_url: string;
  thumbnail_url: string;
  caption?: string;
  likes_count?: number;
  comments_count?: number;
  posted_at: string;
}

interface ProfileData {
  username: string;
  full_name: string;
  bio: string;
  followers_count: number;
  following_count: number;
  profile_pic_url: string;
  posts_count: number;
  is_private: boolean;
}

async function fetchInstagramProfileAPI(accessToken: string, username: string): Promise<{ profile: ProfileData; posts: InstagramPost[] } | null> {
  try {
    const userSearchResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count&access_token=${accessToken}`
    );

    if (!userSearchResponse.ok) {
      return null;
    }

    const userData = await userSearchResponse.json();

    const profileResponse = await fetch(
      `https://graph.instagram.com/${userData.id}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media.limit(50){id,caption,media_type,media_url,timestamp,like_count,comments_count,ig_id}&access_token=${accessToken}`
    );

    if (!profileResponse.ok) {
      return null;
    }

    const profileData = await profileResponse.json();

    const profile: ProfileData = {
      username: profileData.username || username,
      full_name: profileData.name || "",
      bio: profileData.biography || "",
      followers_count: profileData.followers_count || 0,
      following_count: profileData.follows_count || 0,
      profile_pic_url: profileData.profile_picture_url || "",
      posts_count: profileData.media?.data?.length || 0,
      is_private: false,
    };

    const posts: InstagramPost[] = [];

    if (profileData.media?.data) {
      profileData.media.data.forEach((post: any) => {
        if (!post.media_url) return;

        if (post.media_type === "VIDEO" || post.media_type === "REELS") return;

        const instagramPost: InstagramPost = {
          id: post.id,
          image_url: post.media_url || "",
          thumbnail_url: post.media_url || "",
          caption: post.caption || "",
          likes_count: post.like_count || 0,
          comments_count: post.comments_count || 0,
          posted_at: post.timestamp || new Date().toISOString(),
        };
        posts.push(instagramPost);
      });
    }

    return { profile, posts };
  } catch (error) {
    console.error("Error fetching from Instagram API:", error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    const accessToken = url.searchParams.get("accessToken");

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const storedToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const tokenToUse = accessToken || storedToken;

    if (!tokenToUse) {
      return new Response(
        JSON.stringify({
          error: "Instagram access token not configured. Please set up Instagram Basic Display API credentials."
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const instagramData = await fetchInstagramProfileAPI(tokenToUse, username);

    if (!instagramData) {
      return new Response(
        JSON.stringify({
          error: "Profile not found. Please check the username and try again.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { profile: profileInfo, posts: instagramPosts } = instagramData;

    if (profileInfo.is_private) {
      return new Response(
        JSON.stringify({
          error: "This profile is private. Only public profiles can be planned.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: existingProfile } = await supabase
      .from("instagram_profiles")
      .select("id")
      .eq("username", profileInfo.username)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      profileId = existingProfile.id;
      await supabase
        .from("instagram_profiles")
        .update({
          profile_pic_url: profileInfo.profile_pic_url,
          full_name: profileInfo.full_name,
          bio: profileInfo.bio,
          followers_count: profileInfo.followers_count,
          following_count: profileInfo.following_count,
          posts_count: profileInfo.posts_count,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", profileId);
    } else {
      const { data: newProfile } = await supabase
        .from("instagram_profiles")
        .insert({
          username: profileInfo.username,
          profile_pic_url: profileInfo.profile_pic_url,
          full_name: profileInfo.full_name,
          bio: profileInfo.bio,
          followers_count: profileInfo.followers_count,
          following_count: profileInfo.following_count,
          posts_count: profileInfo.posts_count,
        })
        .select("id")
        .single();
      profileId = newProfile!.id;
    }

    await supabase
      .from("grid_posts")
      .delete()
      .eq("profile_id", profileId)
      .eq("is_planned", false);

    for (let i = 0; i < instagramPosts.length; i++) {
      const post = instagramPosts[i];

      await supabase.from("grid_posts").insert({
        profile_id: profileId,
        post_id: post.id,
        image_url: post.image_url,
        thumbnail_url: post.thumbnail_url,
        caption: post.caption,
        original_position: i,
        current_position: i,
        is_planned: false,
        is_hidden: false,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        posted_at: post.posted_at,
      });
    }

    return new Response(
      JSON.stringify({
        profile: {
          id: profileId,
          username: profileInfo.username,
          profile_pic_url: profileInfo.profile_pic_url,
          full_name: profileInfo.full_name,
          bio: profileInfo.bio,
          followers_count: profileInfo.followers_count,
          following_count: profileInfo.following_count,
          posts_count: profileInfo.posts_count,
        },
        posts: instagramPosts,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching Instagram profile:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch Instagram profile",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
