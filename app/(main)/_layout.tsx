import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Hop as Home, Search, Library, Bell, User as UserIcon, Play } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing, radius } from '@/theme';
import { useVideos } from '@/contexts';

interface TabConfig {
  name: string;
  title: string;
  icon: LucideIcon;
}

const tabs: TabConfig[] = [
  { name: 'home', title: 'Home', icon: Home },
  { name: 'reels', title: 'Reels', icon: Play },
  { name: 'search', title: 'Search', icon: Search },
  { name: 'library', title: 'Library', icon: Library },
  { name: 'notifications', title: 'Alerts', icon: Bell },
  { name: 'profile', title: 'Profile', icon: UserIcon },
];

export default function MainLayout() {
  const { unreadNotificationCount } = useVideos();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarIconStyle: styles.icon,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <View>
                <tab.icon
                  size={size}
                  color={color}
                  strokeWidth={2}
                  accessibilityLabel={`${tab.title} tab`}
                  accessibilityRole="button"
                />
                {tab.name === 'notifications' && unreadNotificationCount > 0 ? (
                  <View
                    style={styles.badge}
                    accessibilityLabel={`${unreadNotificationCount} unread notifications`}
                  />
                ) : null}
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.backgroundElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.select({ ios: 84, default: 64 }),
    paddingHorizontal: spacing.sm,
    ...Platform.select({
      ios: {},
      default: { elevation: 0 },
    }),
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginTop: 2,
  },
  item: {
    paddingVertical: spacing.xs,
  },
  icon: {
    marginBottom: 0,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: colors.backgroundElevated,
  },
});
