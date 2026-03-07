import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Linking, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { useCommunityStore } from '../../stores/community';
import type { CommunityPost, PostReaction } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: { key: string; label: string }[] = [
  { key: 'wins_this_week',  label: 'Wins' },
  { key: 'depressive_days', label: 'Depressive Days' },
  { key: 'mania_stories',   label: 'Mania Stories' },
  { key: 'medication_talk', label: 'Medication Talk' },
  { key: 'caregiver_corner',label: 'Caregiver Corner' },
];

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Crisis Banner ────────────────────────────────────────────────────────────

function CrisisBanner() {
  return (
    <View style={s.crisisBanner}>
      <Text style={s.crisisTitle}>Crisis support — always available</Text>
      <View style={s.crisisLinks}>
        <TouchableOpacity onPress={() => Linking.openURL('tel:988')}>
          <Text style={s.crisisLink}>📞 988</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('sms:741741?body=HOME')}>
          <Text style={s.crisisLink}>💬 Text HOME to 741741</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://nami.org/help')}>
          <Text style={s.crisisLink}>🌐 NAMI Helpline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post, userId, onReact, onDelete,
}: {
  post: CommunityPost;
  userId: string;
  onReact: (postId: string, reaction: PostReaction) => void;
  onDelete: (postId: string) => void;
}) {
  const isOwn = post.author_id === userId;
  const isPending = post.moderation_status === 'pending';

  const relateCt = post.reactions?.filter((r) => r.reaction === 'i_relate').length ?? 0;
  const thankCt = post.reactions?.filter((r) => r.reaction === 'thank_you_for_sharing').length ?? 0;
  const myReaction = post.reactions?.find((r) => r.user_id === userId)?.reaction;

  return (
    <View style={[s.postCard, isPending && s.postCardPending]}>
      {isPending && (
        <Text style={s.pendingTag}>Pending review — visible only to you</Text>
      )}

      <Text style={s.postBody}>{post.body}</Text>

      <View style={s.postFooter}>
        <Text style={s.postAge}>{formatAge(post.created_at)}</Text>

        <View style={s.reactionRow}>
          <TouchableOpacity
            style={[s.reactionBtn, myReaction === 'i_relate' && s.reactionBtnActive]}
            onPress={() => onReact(post.id, 'i_relate')}
            disabled={isPending}
          >
            <Text style={s.reactionIcon}>💜</Text>
            {relateCt > 0 && <Text style={s.reactionCount}>{relateCt}</Text>}
            <Text style={s.reactionLabel}>I relate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.reactionBtn, myReaction === 'thank_you_for_sharing' && s.reactionBtnActive]}
            onPress={() => onReact(post.id, 'thank_you_for_sharing')}
            disabled={isPending}
          >
            <Text style={s.reactionIcon}>🙏</Text>
            {thankCt > 0 && <Text style={s.reactionCount}>{thankCt}</Text>}
            <Text style={s.reactionLabel}>Thank you</Text>
          </TouchableOpacity>

          {isOwn && (
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() =>
                Alert.alert('Delete post?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete(post.id) },
                ])
              }
            >
              <Text style={s.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { session } = useAuthStore();
  const store = useCommunityStore();
  const router = useRouter();
  const userId = session?.user.id ?? '';

  const [activeChannel, setActiveChannel] = useState('wins_this_week');
  const [postSheetVisible, setPostSheetVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    store.loadChannel(userId, activeChannel);
  }, [userId, activeChannel]);

  const handlePost = useCallback(async () => {
    if (!postText.trim()) return;
    setPosting(true);
    await store.post(userId, postText.trim());
    setPostText('');
    setPosting(false);
    setPostSheetVisible(false);
  }, [userId, postText]);

  const handleReact = useCallback((postId: string, reaction: PostReaction) => {
    store.react(userId, postId, reaction);
  }, [userId]);

  const handleDelete = useCallback((postId: string) => {
    store.deletePost(userId, postId);
  }, [userId]);

  return (
    <SafeAreaView style={s.safe}>

      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←  Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Community</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Crisis banner — always visible, non-dismissible */}
      <CrisisBanner />

      {/* Channel tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.channelTabs}
        contentContainerStyle={s.channelTabsContent}
      >
        {CHANNELS.map((ch) => (
          <TouchableOpacity
            key={ch.key}
            style={[s.channelTab, activeChannel === ch.key && s.channelTabActive]}
            onPress={() => setActiveChannel(ch.key)}
          >
            <Text style={[s.channelTabText, activeChannel === ch.key && s.channelTabTextActive]}>
              {ch.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      <ScrollView
        contentContainerStyle={s.feed}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
            store.loadMore(userId);
          }
        }}
        scrollEventThrottle={400}
      >
        {store.isLoading && store.posts.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator color="#A8C5A0" />
          </View>
        ) : store.posts.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyText}>Be the first to post in this channel.</Text>
          </View>
        ) : (
          store.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              onReact={handleReact}
              onDelete={handleDelete}
            />
          ))
        )}

        {store.isLoading && store.posts.length > 0 && (
          <View style={s.loadingMore}>
            <ActivityIndicator size="small" color="#A8C5A0" />
          </View>
        )}

        {!store.hasMore && store.posts.length > 0 && (
          <Text style={s.endText}>You've reached the end.</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <View style={s.fabContainer}>
        <TouchableOpacity style={s.fab} onPress={() => setPostSheetVisible(true)}>
          <Text style={s.fabText}>+  Post</Text>
        </TouchableOpacity>
      </View>

      {/* Post sheet */}
      <Modal visible={postSheetVisible} transparent animationType="slide">
        <Pressable style={s.backdrop} onPress={() => setPostSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Share anonymously</Text>
            <Text style={s.sheetChannel}>
              {CHANNELS.find((c) => c.key === activeChannel)?.label}
            </Text>
            <TextInput
              style={s.postInput}
              value={postText}
              onChangeText={setPostText}
              placeholder="What's on your mind? All posts are anonymous."
              placeholderTextColor="#3D393540"
              multiline
              autoFocus
              maxLength={600}
            />
            <Text style={s.charCount}>{postText.length}/600</Text>
            <Text style={s.moderationNote}>
              Posts are reviewed before appearing to others. You'll always see your own posts.
            </Text>
            <TouchableOpacity
              style={[s.postBtn, (!postText.trim() || posting) && s.postBtnDisabled]}
              onPress={handlePost}
              disabled={!postText.trim() || posting}
            >
              <Text style={s.postBtnText}>{posting ? 'Posting…' : 'Post'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: { paddingVertical: 6, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#3D3935' },

  crisisBanner: {
    backgroundColor: '#3D3935', paddingHorizontal: 16, paddingVertical: 10,
  },
  crisisTitle: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', opacity: 0.6, letterSpacing: 0.5, marginBottom: 6 },
  crisisLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  crisisLink: { fontSize: 12, color: '#A8C5A0', fontWeight: '600' },

  channelTabs: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
  channelTabsContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  channelTab: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  channelTabActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  channelTabText: { fontSize: 13, color: '#3D3935', opacity: 0.45, fontWeight: '500' },
  channelTabTextActive: { color: '#A8C5A0', opacity: 1, fontWeight: '700' },

  feed: { paddingHorizontal: 16, paddingTop: 12 },
  center: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#3D3935', opacity: 0.3 },

  postCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },
  postCardPending: { borderWidth: 1.5, borderColor: '#E8DCC8', borderStyle: 'dashed' },
  pendingTag: { fontSize: 11, color: '#3D3935', opacity: 0.35, marginBottom: 8, fontStyle: 'italic' },
  postBody: { fontSize: 15, color: '#3D3935', lineHeight: 22, marginBottom: 12 },
  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postAge: { fontSize: 11, color: '#3D3935', opacity: 0.3 },

  reactionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E0DDD8',
  },
  reactionBtnActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  reactionIcon: { fontSize: 13 },
  reactionCount: { fontSize: 12, color: '#3D3935', fontWeight: '600' },
  reactionLabel: { fontSize: 11, color: '#3D3935', opacity: 0.5 },

  deleteBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  deleteBtnText: { fontSize: 11, color: '#C4A0B0', fontWeight: '500' },

  loadingMore: { paddingVertical: 16, alignItems: 'center' },
  endText: { fontSize: 12, color: '#3D3935', opacity: 0.25, textAlign: 'center', paddingVertical: 16 },

  fabContainer: {
    position: 'absolute', bottom: 24, right: 20,
  },
  fab: {
    backgroundColor: '#3D3935', borderRadius: 24,
    paddingVertical: 12, paddingHorizontal: 20,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  fabText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  backdrop: { flex: 1, backgroundColor: '#00000030', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  sheetChannel: { fontSize: 13, color: '#A8C5A0', fontWeight: '600', marginBottom: 14 },
  postInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    minHeight: 100, fontSize: 15, color: '#3D3935', lineHeight: 22, marginBottom: 6,
  },
  charCount: { fontSize: 11, color: '#3D3935', opacity: 0.3, textAlign: 'right', marginBottom: 10 },
  moderationNote: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 17, marginBottom: 14 },
  postBtn: { backgroundColor: '#3D3935', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  postBtnDisabled: { opacity: 0.35 },
  postBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
