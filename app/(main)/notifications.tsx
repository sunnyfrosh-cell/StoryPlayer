import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, BellOff, CheckCheck } from 'lucide-react-native';
import type { AppNotification } from '@/types';
import { useVideos } from '@/contexts';
import { colors, spacing, radius, typography } from '@/theme';
import { NotificationCard, EmptyState, LoadingScreen } from '@/components';

type NotificationFilter = 'all' | 'unread';

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

export default function NotificationsScreen() {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    isLoading,
  } = useVideos();

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const hasUnread = unreadNotificationCount > 0;

  const filteredNotifications = useMemo<AppNotification[]>(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const handlePress = useCallback(
    (n: AppNotification) => {
      if (!n.read) markNotificationRead(n.id);
      if (n.targetVideoId) router.push(`/watch/${n.targetVideoId}`);
    },
    [markNotificationRead],
  );

  const handleMarkAll = useCallback(() => {
    markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Data is realtime, but keep the gesture responsive.
    await new Promise((r) => setTimeout(r, 500));
    setIsRefreshing(false);
  }, []);

  const renderEmpty = useCallback(() => {
    if (filter === 'unread') {
      return (
        <EmptyState
          icon={BellOff}
          title="No unread notifications"
          description="You're all caught up! New unread activity will appear here."
        />
      );
    }
    return (
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="When there's new activity on your account, you'll find it here."
      />
    );
  }, [filter]);

  if (isLoading && notifications.length === 0) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.titleRow}>
          <Text style={[typography.h2, styles.title]}>Notifications</Text>
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotificationCount}</Text>
            </View>
          ) : null}
        </View>
        {hasUnread ? (
          <Pressable style={styles.markAllBtn} onPress={handleMarkAll} hitSlop={8}>
            <CheckCheck size={18} color={colors.secondary} strokeWidth={2} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {FILTERS.map((tab) => {
          const active = filter === tab.key;
          const showCount = tab.key === 'unread' && unreadNotificationCount > 0;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {showCount ? (
                <View style={styles.tabCount}>
                  <Text style={styles.tabCountText}>{unreadNotificationCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard notification={item} onPress={handlePress} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.text,
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.base,
    backgroundColor: `${colors.secondary}1A`,
  },
  markAllText: {
    color: colors.secondary,
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
  },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    color: colors.text,
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
});
