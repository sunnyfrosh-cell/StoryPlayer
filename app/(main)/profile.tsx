import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings as SettingsIcon, CreditCard as Edit3, Crown, Video as VideoIcon, Camera, BadgeCheck, MapPin, Twitter, Instagram, Youtube, ExternalLink, Heart, Bookmark as BookmarkIcon, ListVideo, LayoutGrid, Users, UserPlus, Bell, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { useUser, useToast, useVideos, useAuth } from '@/contexts';
import { Avatar, Badge, CustomButton, VideoCard } from '@/components';
import { getIcon, formatCount, normalizeMediaUri } from '@/utils';
import { uploadAvatar, uploadCoverImage, isCloudinaryConfigured } from '@/services/cloudinary';
import { videoRepository } from '@/firebase';
import type { User, Video, Playlist, SocialLinks } from '@/types';

type TabKey = 'videos' | 'liked' | 'playlists' | 'bookmarks';

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.base;
const VIDEO_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function ProfileScreen() {
  const { profile, stats, achievements, updateProfile, isLoading } = useUser();
  const {
    myVideos,
    videos,
    likedVideoIds,
    playlists,
    bookmarks,
    toggleFollow,
    isFollowing,
    toggleSubscription,
    isSubscribed,
    getUserProfile,
  } = useVideos();
  const { firebaseUser } = useAuth();
  const toast = useToast();

  const searchParams = useLocalSearchParams<{ creatorId?: string }>();
  const creatorId = searchParams.creatorId;
  const isViewingOther = Boolean(creatorId && firebaseUser && creatorId !== firebaseUser.uid);
  const insets = useSafeAreaInsets();

  // ---- Other creator state ----
  const [creatorProfile, setCreatorProfile] = useState<User | null>(null);
  const [creatorVideos, setCreatorVideos] = useState<Video[]>([]);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    if (!isViewingOther || !creatorId) return;
    let mounted = true;
    setCreatorLoading(true);
    setCreatorError(null);
    Promise.all([getUserProfile(creatorId), videoRepository.getByCreator(creatorId)])
      .then(([user, vids]) => {
        if (!mounted) return;
        setCreatorProfile(user);
        setCreatorVideos(vids);
      })
      .catch((err) => {
        if (!mounted) return;
        setCreatorError(err instanceof Error ? err.message : 'Could not load this profile.');
      })
      .finally(() => {
        if (mounted) setCreatorLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [creatorId, isViewingOther, getUserProfile]);

  // ---- Upload state ----
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState<TabKey>('videos');

  // Resolve which profile we are rendering
  const activeProfile: User | null = isViewingOther ? creatorProfile : profile;
  const activeVideos: Video[] = isViewingOther ? creatorVideos : myVideos;
  const bannerUri = normalizeMediaUri(activeProfile?.coverUrl);

  // ---- Loading guard ----
  if (isViewingOther && creatorLoading) {
    return (
      <View style={styles.loadingShell}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={[typography.bodySmall, styles.loadingText]}>Loading profile…</Text>
      </View>
    );
  }

  if (isViewingOther && creatorError) {
    return (
      <View style={styles.loadingShell}>
        <Text style={[typography.h4, styles.errorText]}>{creatorError}</Text>
        <CustomButton title="Go back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  if (!activeProfile) {
    return (
      <View style={styles.loadingShell}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const socialLinks: SocialLinks = activeProfile.socialLinks ?? {
    twitter: null,
    instagram: null,
    youtube: null,
    website: null,
  };
  const hasSocialLinks = Boolean(
    socialLinks.twitter || socialLinks.instagram || socialLinks.youtube || socialLinks.website,
  );

  // ---- Liked videos (own profile only) ----
  const likedVideos = useMemo(() => {
    if (isViewingOther) return [];
    return videos.filter((v) => likedVideoIds.includes(v.id));
  }, [videos, likedVideoIds, isViewingOther]);

  // ---- Bookmarked videos (own profile only) ----
  const bookmarkedVideos = useMemo(() => {
    if (isViewingOther) return [];
    const ids = bookmarks.map((b) => b.videoId);
    return videos.filter((v) => ids.includes(v.id));
  }, [videos, bookmarks, isViewingOther]);

  // ---- Active playlists ----
  const activePlaylists = isViewingOther ? [] : playlists;

  // ---- Tab definitions ----
  const tabs: TabDef[] = isViewingOther
    ? [{ key: 'videos', label: 'Videos', icon: VideoIcon }]
    : [
        { key: 'videos', label: 'Videos', icon: VideoIcon },
        { key: 'liked', label: 'Liked', icon: Heart },
        { key: 'playlists', label: 'Playlists', icon: ListVideo },
        { key: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
      ];

  // ---- Handlers ----
  const handleAvatarPick = useCallback(async () => {
    if (!firebaseUser || !profile) return;
    if (!isCloudinaryConfigured()) {
      toast.error('Cloudinary is not configured. Add your Cloudinary credentials to .env to upload images.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is needed to upload an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const rawUri = result.assets?.[0]?.uri;
    const normalizedUri = normalizeMediaUri(rawUri);
    if (result.canceled || !normalizedUri) {
      if (!result.canceled) {
        toast.error('The selected image is invalid. Please choose another photo.');
      }
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const upload = await uploadAvatar(firebaseUser.uid, normalizedUri, {
        onProgress: (pct) => setAvatarProgress(pct),
      });
      await updateProfile({ avatarUrl: upload.secureUrl });
      toast.success('Avatar updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not upload avatar. Please try again.';
      toast.error(message);
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(0);
    }
  }, [firebaseUser, profile, updateProfile, toast]);

  const handleCoverPick = useCallback(async () => {
    if (!firebaseUser || !profile) return;
    if (!isCloudinaryConfigured()) {
      toast.error('Cloudinary is not configured. Add your Cloudinary credentials to .env to upload images.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is needed to upload a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    const rawUri = result.assets?.[0]?.uri;
    const normalizedUri = normalizeMediaUri(rawUri);
    if (result.canceled || !normalizedUri) {
      if (!result.canceled) {
        toast.error('The selected cover image is invalid. Please choose another photo.');
      }
      return;
    }

    setCoverUploading(true);
    setCoverProgress(0);
    try {
      const upload = await uploadCoverImage(firebaseUser.uid, normalizedUri, {
        onProgress: (pct) => setCoverProgress(pct),
      });
      await updateProfile({ coverUrl: upload.secureUrl });
      toast.success('Cover image updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not upload cover image. Please try again.';
      toast.error(message);
    } finally {
      setCoverUploading(false);
      setCoverProgress(0);
    }
  }, [firebaseUser, profile, updateProfile, toast]);

  const openEdit = () => {
    router.push('/edit-profile');
  };

  const handleFollow = async () => {
    if (!creatorId) return;
    setFollowBusy(true);
    try {
      const nowFollowing = await toggleFollow(creatorId);
      setCreatorProfile((prev) => prev ? {
        ...prev,
        followersCount: Math.max(0, prev.followersCount + (nowFollowing ? 1 : -1)),
      } : prev);
      toast.success(nowFollowing ? 'Following.' : 'Unfollowed.');
    } catch {
      toast.error('Could not update follow status.');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleSubscribe = async () => {
    if (!creatorId) return;
    setSubBusy(true);
    try {
      const nowSubscribed = await toggleSubscription(creatorId);
      setCreatorProfile((prev) => prev ? {
        ...prev,
        subscribersCount: Math.max(0, prev.subscribersCount + (nowSubscribed ? 1 : -1)),
      } : prev);
      toast.success(nowSubscribed ? 'Subscribed.' : 'Unsubscribed.');
    } catch {
      toast.error('Could not update subscription.');
    } finally {
      setSubBusy(false);
    }
  };

  const openLink = (url: string) => {
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => toast.error('Could not open link.'));
  };

  const statItems = [
    { label: 'Followers', value: activeProfile.followersCount },
    { label: 'Following', value: activeProfile.followingCount },
    { label: 'Subscribers', value: activeProfile.subscribersCount },
    { label: 'Videos', value: activeProfile.videosCount },
  ];

  const following = isViewingOther && creatorId ? isFollowing(creatorId) : false;
  const subscribed = isViewingOther && creatorId ? isSubscribed(creatorId) : false;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* ============ Banner ============ */}
      <View style={styles.bannerWrap}>
        {bannerUri ? (
          <ImageBackground source={{ uri: bannerUri }} style={styles.banner} resizeMode="cover">
            <LinearGradient
              colors={['rgba(11,11,15,0.25)', 'rgba(11,11,15,0.55)', colors.background]}
              locations={[0, 0.5, 1]}
              style={styles.bannerGradient}
            >
              {renderBannerTopBar({
                isViewingOther,
                coverUploading,
                coverProgress,
                onCoverPick: handleCoverPick,
                topInset: insets.top,
              })}
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={[colors.primaryDark, colors.secondaryDark, colors.background]}
            locations={[0, 0.5, 1]}
            style={styles.banner}
          >
            <LinearGradient
              colors={['rgba(11,11,15,0.15)', 'rgba(11,11,15,0.4)', colors.background]}
              locations={[0, 0.5, 1]}
              style={styles.bannerGradient}
            >
              {renderBannerTopBar({
                isViewingOther,
                coverUploading,
                coverProgress,
                onCoverPick: handleCoverPick,
                topInset: insets.top,
              })}
            </LinearGradient>
          </LinearGradient>
        )}
      </View>

      {/* ============ Identity ============ */}
      <View style={styles.identitySection}>
        <View style={styles.avatarRow}>
          <Pressable onPress={isViewingOther ? undefined : handleAvatarPick} disabled={avatarUploading}>
            <View style={styles.avatarWrap}>
              <Avatar uri={activeProfile.avatarUrl} size={104} ring />
              {!isViewingOther ? (
                <View style={styles.cameraBadge}>
                  {avatarUploading ? (
                    avatarProgress > 0 ? (
                      <Text style={[typography.overline, { color: colors.text, fontSize: 8 }]}>
                        {avatarProgress}%
                      </Text>
                    ) : (
                      <ActivityIndicator size={14} color={colors.text} />
                    )
                  ) : (
                    <Camera size={14} color={colors.text} />
                  )}
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View style={styles.nameRow}>
          <Text style={[typography.h2, styles.displayName]} numberOfLines={1}>
            {activeProfile.displayName}
          </Text>
          {activeProfile.isVerified ? <BadgeCheck size={22} color={colors.secondary} /> : null}
        </View>

        <Text style={[typography.bodySmall, styles.username]}>@{activeProfile.username}</Text>

        {activeProfile.isCreator ? (
          <View style={styles.creatorBadgeWrap}>
            <Badge label="Creator" variant="primary" icon={<Crown size={11} color={colors.text} />} />
          </View>
        ) : null}

        {activeProfile.bio ? (
          <Text style={[typography.bodySmall, styles.bio]}>{activeProfile.bio}</Text>
        ) : null}

        {activeProfile.location ? (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[typography.caption, styles.locationText]}>{activeProfile.location}</Text>
          </View>
        ) : null}

        {/* ============ Social Links ============ */}
        {hasSocialLinks ? (
          <View style={styles.socialRow}>
            {socialLinks.twitter ? (
              <SocialLinkButton icon={Twitter} onPress={() => openLink(socialLinks.twitter!)} />
            ) : null}
            {socialLinks.instagram ? (
              <SocialLinkButton icon={Instagram} onPress={() => openLink(socialLinks.instagram!)} />
            ) : null}
            {socialLinks.youtube ? (
              <SocialLinkButton icon={Youtube} onPress={() => openLink(socialLinks.youtube!)} />
            ) : null}
            {socialLinks.website ? (
              <SocialLinkButton icon={ExternalLink} onPress={() => openLink(socialLinks.website!)} />
            ) : null}
          </View>
        ) : null}

        {/* ============ Action Buttons ============ */}
        {isViewingOther ? (
          <View style={styles.actionRow}>
            <CustomButton
              title={following ? 'Following' : 'Follow'}
              variant={following ? 'outline' : 'primary'}
              style={styles.actionBtn}
              loading={followBusy}
              leftIcon={<UserPlus size={16} color={following ? colors.primary : colors.text} />}
              onPress={handleFollow}
            />
            <CustomButton
              title={subscribed ? 'Subscribed' : 'Subscribe'}
              variant={subscribed ? 'outline' : 'secondary'}
              style={styles.actionBtn}
              loading={subBusy}
              leftIcon={<Bell size={16} color={subscribed ? colors.primary : colors.text} />}
              onPress={handleSubscribe}
            />
          </View>
        ) : (
          <View style={styles.actionRow}>
            <CustomButton
              title="Edit profile"
              variant="primary"
              style={styles.actionBtn}
              leftIcon={<Edit3 size={16} color={colors.text} />}
              onPress={openEdit}
            />
            <CustomButton
              title="Upload"
              variant="secondary"
              style={styles.actionBtn}
              leftIcon={<VideoIcon size={16} color={colors.text} />}
              onPress={() => router.push('/upload')}
            />
          </View>
        )}

        {profile?.isCreator && !isViewingOther ? (
          <Pressable style={styles.dashboardLink} onPress={() => router.push('/dashboard')}>
            <LayoutGrid size={18} color={colors.secondary} />
            <Text style={[typography.label, styles.dashboardText]}>Creator Dashboard</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {/* ============ Stats Row ============ */}
        <View style={styles.statsRow}>
          {statItems.map((s, i) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={[typography.h4, styles.statValue]}>{formatCount(s.value)}</Text>
              <Text style={[typography.caption, styles.statLabel]}>{s.label}</Text>
              {i < statItems.length - 1 ? <View style={styles.statDivider} /> : null}
            </View>
          ))}
        </View>
      </View>

      {/* ============ Tabs ============ */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <tab.icon size={16} color={active ? colors.secondary : colors.textMuted} />
                <Text style={[typography.label, active ? styles.tabTextActive : styles.tabText]}>
                  {tab.label}
                </Text>
                {active ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ============ Tab Content ============ */}
      <View style={styles.tabContent}>
        {activeTab === 'videos' ? (
          activeVideos.length > 0 ? (
            <View style={styles.videoGrid}>
              {activeVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  width={VIDEO_CARD_WIDTH}
                  onPress={() => router.push(`/watch/${video.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyTab icon={VideoIcon} message={isViewingOther ? 'No videos yet.' : 'You haven\u2019t uploaded any videos.'} />
          )
        ) : null}

        {activeTab === 'liked' ? (
          likedVideos.length > 0 ? (
            <View style={styles.videoGrid}>
              {likedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  width={VIDEO_CARD_WIDTH}
                  onPress={() => router.push(`/watch/${video.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyTab icon={Heart} message="No liked videos yet." />
          )
        ) : null}

        {activeTab === 'playlists' ? (
          activePlaylists.length > 0 ? (
            <View style={styles.listColumn}>
              {activePlaylists.map((pl) => (
                <PlaylistRow
                  key={pl.id}
                  playlist={pl}
                  onPress={() => router.push(`/watch/${pl.videoIds[0] ?? ''}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyTab icon={ListVideo} message="No playlists yet." />
          )
        ) : null}

        {activeTab === 'bookmarks' ? (
          bookmarkedVideos.length > 0 ? (
            <View style={styles.videoGrid}>
              {bookmarkedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  width={VIDEO_CARD_WIDTH}
                  onPress={() => router.push(`/watch/${video.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyTab icon={BookmarkIcon} message="No bookmarked videos yet." />
          )
        ) : null}
      </View>

      {/* ============ Own profile extras ============ */}
      {!isViewingOther ? (
        <View style={styles.section}>
          {achievements.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[typography.h4, styles.sectionTitle]}>Achievements</Text>
                <Text style={[typography.caption, styles.sectionMeta]}>
                  {achievements.filter((a) => a.unlockedAt).length}/{achievements.length}
                </Text>
              </View>
              <View style={styles.achievementGrid}>
                {achievements.map((item) => (
                  <AchievementCard key={item.id} achievement={item} />
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.menuGroup}>
            <MenuRow label="Account settings" onPress={() => router.push('/settings')} />
            <MenuRow label="Help & support" onPress={() => router.push('/settings')} />
          </View>
        </View>
      ) : null}

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Helper render functions & sub-components                            */
/* ------------------------------------------------------------------ */

interface BannerTopBarProps {
  isViewingOther: boolean;
  coverUploading: boolean;
  coverProgress: number;
  onCoverPick: () => void;
  topInset: number;
}

function renderBannerTopBar({ isViewingOther, coverUploading, coverProgress, onCoverPick, topInset }: BannerTopBarProps) {
  return (
    <View style={[styles.bannerTopBar, { paddingTop: topInset + spacing.sm }]}>
      <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={12}>
        <ChevronRight size={22} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
      </Pressable>
      <View style={styles.bannerTopRight}>
        {!isViewingOther ? (
          <Pressable onPress={onCoverPick} disabled={coverUploading} style={styles.iconButton} hitSlop={12}>
            {coverUploading ? (
              coverProgress > 0 ? (
                <Text style={[typography.overline, { color: colors.text, fontSize: 9 }]}>
                  {coverProgress}%
                </Text>
              ) : (
                <ActivityIndicator size={16} color={colors.text} />
              )
            ) : (
              <Camera size={20} color={colors.text} />
            )}
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push('/settings')} style={styles.iconButton} hitSlop={12}>
          <SettingsIcon size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

interface SocialLinkButtonProps {
  icon: LucideIcon;
  onPress: () => void;
}

function SocialLinkButton({ icon: Icon, onPress }: SocialLinkButtonProps) {
  return (
    <Pressable style={styles.socialButton} onPress={onPress} hitSlop={8}>
      <Icon size={18} color={colors.text} />
    </Pressable>
  );
}

interface EmptyTabProps {
  icon: LucideIcon;
  message: string;
}

function EmptyTab({ icon: Icon, message }: EmptyTabProps) {
  return (
    <View style={styles.emptyTab}>
      <View style={styles.emptyIconWrap}>
        <Icon size={28} color={colors.textMuted} />
      </View>
      <Text style={[typography.bodySmall, styles.emptyText]}>{message}</Text>
    </View>
  );
}

interface PlaylistRowProps {
  playlist: Playlist;
  onPress: () => void;
}

function PlaylistRow({ playlist, onPress }: PlaylistRowProps) {
  return (
    <Pressable style={styles.playlistRow} onPress={onPress}>
      {playlist.coverUrl ? (
        <ImageBackground
          source={{ uri: playlist.coverUrl }}
          style={styles.playlistCover}
          imageStyle={styles.playlistCoverImage}
        >
          <View style={styles.playlistCoverOverlay}>
            <ListVideo size={18} color={colors.text} />
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.playlistCover, styles.playlistCoverPlaceholder]}>
          <ListVideo size={18} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={[typography.label, styles.playlistTitle]} numberOfLines={1}>
          {playlist.title}
        </Text>
        <Text style={[typography.caption, styles.playlistMeta]}>
          {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
          {playlist.isPrivate ? ' · Private' : ''}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

interface AchievementCardProps {
  achievement: import('@/types').Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const Icon = getIcon(achievement.iconName);
  const unlocked = Boolean(achievement.unlockedAt);
  const progress = Math.min(1, achievement.progress / achievement.target);

  return (
    <View style={[styles.achievement, !unlocked && styles.achievementLocked]}>
      <View
        style={[
          styles.achievementIcon,
          { backgroundColor: unlocked ? 'rgba(124,58,237,0.22)' : colors.surface },
        ]}
      >
        <Icon size={24} color={unlocked ? colors.secondary : colors.textMuted} strokeWidth={2} />
      </View>
      <Text style={[typography.label, styles.achievementName]} numberOfLines={1}>
        {achievement.name}
      </Text>
      <Text style={[typography.caption, styles.achievementDesc]} numberOfLines={2}>
        {achievement.description}
      </Text>
      {unlocked ? (
        <Badge label="Unlocked" variant="soft" />
      ) : (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

interface MenuRowProps {
  label: string;
  onPress: () => void;
}

function MenuRow({ label, onPress }: MenuRowProps) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Text style={[typography.body, styles.menuLabel]}>{label}</Text>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing['2xl'] },
  loadingShell: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loadingText: { color: colors.textSecondary },
  errorText: { color: colors.error, textAlign: 'center' },

  // ---- Banner ----
  bannerWrap: { position: 'relative' },
  banner: { width: '100%', height: 220 },
  bannerGradient: { flex: 1, justifyContent: 'flex-start' },
  bannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  bannerTopRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,11,15,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Identity ----
  identitySection: {
    paddingHorizontal: spacing.base,
    marginTop: -spacing['4xl'],
  },
  avatarRow: { marginBottom: spacing.sm },
  avatarWrap: { position: 'relative', alignSelf: 'flex-start' },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.background,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  displayName: { color: colors.text, fontFamily: 'Sora-Bold', flexShrink: 1 },
  username: { color: colors.textSecondary, marginBottom: spacing.xs },
  creatorBadgeWrap: { marginBottom: spacing.sm },
  bio: { color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  locationText: { color: colors.textMuted },

  // ---- Social Links ----
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ---- Actions ----
  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionBtn: { flex: 1, minWidth: 0 },
  dashboardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dashboardText: { color: colors.text, flex: 1, marginLeft: spacing.sm },

  // ---- Stats ----
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: colors.text },
  statLabel: { color: colors.textMuted },
  statDivider: {
    position: 'absolute',
    right: -0.5,
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // ---- Tabs ----
  tabsContainer: {
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScroll: { paddingHorizontal: spacing.base, gap: spacing.lg },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  tabActive: {},
  tabText: { color: colors.textMuted },
  tabTextActive: { color: colors.secondary },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },

  // ---- Tab Content ----
  tabContent: { paddingHorizontal: GRID_PADDING, paddingTop: spacing.md },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  listColumn: { gap: spacing.sm },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: colors.textMuted },

  // ---- Playlist Row ----
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  playlistCover: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  playlistCoverImage: { borderRadius: radius.md },
  playlistCoverOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,11,15,0.4)',
  },
  playlistCoverPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: { flex: 1, gap: 2 },
  playlistTitle: { color: colors.text },
  playlistMeta: { color: colors.textMuted },

  // ---- Section ----
  section: { paddingHorizontal: spacing.base, marginTop: spacing.xl },
  sectionTitle: { color: colors.text, marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionMeta: { color: colors.textMuted },
  menuGroup: { gap: spacing.sm },

  // ---- Achievements ----
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  achievement: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.xs,
  },
  achievementLocked: { opacity: 0.7 },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementName: { color: colors.text },
  achievementDesc: { color: colors.textSecondary, minHeight: 36 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.secondary },

  // ---- Menu Row ----
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
  },
  menuLabel: { color: colors.text },


});
