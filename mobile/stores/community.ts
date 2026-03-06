import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CommunityPost, PostReaction } from '../types/database';

const PAGE_SIZE = 25;

interface CommunityStore {
  channel: string;
  posts: CommunityPost[];
  isLoading: boolean;
  hasMore: boolean;

  loadChannel: (userId: string, channel: string) => Promise<void>;
  loadMore: (userId: string) => Promise<void>;
  post: (userId: string, body: string) => Promise<void>;
  react: (userId: string, postId: string, reaction: PostReaction) => Promise<void>;
  deletePost: (userId: string, postId: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  channel: 'wins_this_week',
  posts: [],
  isLoading: false,
  hasMore: true,

  loadChannel: async (userId, channel) => {
    set({ channel, posts: [], isLoading: true, hasMore: true });

    const { data } = await supabase
      .from('community_posts')
      .select('*, reactions:community_reactions(reaction, user_id)')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    set({
      posts: (data ?? []) as CommunityPost[],
      isLoading: false,
      hasMore: (data?.length ?? 0) === PAGE_SIZE,
    });
  },

  loadMore: async (userId) => {
    const { posts, channel, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    set({ isLoading: true });

    const { data } = await supabase
      .from('community_posts')
      .select('*, reactions:community_reactions(reaction, user_id)')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .range(posts.length, posts.length + PAGE_SIZE - 1);

    set({
      posts: [...posts, ...(data ?? []) as CommunityPost[]],
      isLoading: false,
      hasMore: (data?.length ?? 0) === PAGE_SIZE,
    });
  },

  post: async (userId, body) => {
    const { channel } = get();
    const optimistic: CommunityPost = {
      id: `temp-${Date.now()}`,
      author_id: userId,
      channel,
      body,
      moderation_status: 'pending',
      moderation_reason: null,
      created_at: new Date().toISOString(),
      reactions: [],
    };

    // Optimistic prepend — author always sees their own post
    set((s) => ({ posts: [optimistic, ...s.posts] }));

    const { data } = await supabase
      .from('community_posts')
      .insert({ author_id: userId, channel, body })
      .select('*, reactions:community_reactions(reaction, user_id)')
      .single();

    if (data) {
      set((s) => ({
        posts: s.posts.map((p) => (p.id === optimistic.id ? (data as CommunityPost) : p)),
      }));
    }
  },

  react: async (userId, postId, reaction) => {
    // Toggle: if already reacted with same, remove it
    const existing = get().posts
      .find((p) => p.id === postId)
      ?.reactions?.find((r) => r.user_id === userId);

    if (existing?.reaction === reaction) {
      // Remove reaction
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? { ...p, reactions: p.reactions?.filter((r) => r.user_id !== userId) }
            : p,
        ),
      }));
      await supabase
        .from('community_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    } else {
      // Upsert reaction
      const newReaction = { reaction, user_id: userId };
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactions: [
                  ...(p.reactions?.filter((r) => r.user_id !== userId) ?? []),
                  newReaction,
                ],
              }
            : p,
        ),
      }));
      await supabase
        .from('community_reactions')
        .upsert({ post_id: postId, user_id: userId, reaction });
    }
  },

  deletePost: async (userId, postId) => {
    set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
    await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', userId);
  },
}));
