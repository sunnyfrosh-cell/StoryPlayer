import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Check } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { useToast } from '@/contexts';

type PreferenceKey = 'language' | 'theme' | 'downloadQuality' | 'playbackSpeed';

const preferences: Record<PreferenceKey, { title: string; storageKey: string; options: { label: string; value: string }[] }> = {
  language: {
    title: 'Language',
    storageKey: 'storyverse.preference.language',
    options: ['English', 'Español', 'Français', 'Deutsch', '日本語', '中文', 'हिन्दी', 'العربية'].map((value) => ({ label: value, value })),
  },
  theme: {
    title: 'Theme',
    storageKey: 'storyverse.preference.theme',
    options: [
      { label: 'Dark', value: 'Dark' },
      { label: 'Light', value: 'Light' },
      { label: 'System Default', value: 'System' },
    ],
  },
  downloadQuality: {
    title: 'Download Quality',
    storageKey: 'storyverse.preference.downloadQuality',
    options: [
      { label: 'Auto (recommended)', value: 'Auto' },
      { label: 'Low (480p)', value: '480p' },
      { label: 'Medium (720p)', value: '720p' },
      { label: 'High (1080p)', value: '1080p' },
    ],
  },
  playbackSpeed: {
    title: 'Video Playback',
    storageKey: 'storyverse.preference.playbackSpeed',
    options: [
      { label: '0.5x', value: '0.5x' },
      { label: '0.75x', value: '0.75x' },
      { label: 'Normal (1x)', value: '1x' },
      { label: '1.25x', value: '1.25x' },
      { label: '1.5x', value: '1.5x' },
      { label: '2x', value: '2x' },
    ],
  },
};

export default function SettingsPreferenceScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ preference?: string; value?: string }>();
  const preferenceKey = typeof params.preference === 'string' ? params.preference : 'language';
  const config = preferences[preferenceKey as PreferenceKey] ?? preferences.language;
  const initialValue = typeof params.value === 'string' ? params.value : config.options[0].value;
  const [selected, setSelected] = useState(initialValue);

  const selectedLabel = useMemo(
    () => config.options.find((option) => option.value === selected)?.label ?? selected,
    [config.options, selected],
  );

  const handleSelect = async (value: string) => {
    setSelected(value);
    try {
      await AsyncStorage.setItem(config.storageKey, value);
      toast.success(`${config.title} updated`);
      router.back();
    } catch {
      toast.error(`Could not save ${config.title.toLowerCase()}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[typography.h3, styles.title]}>{config.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.selectedHint}>Current selection: {selectedLabel}</Text>
        <View style={styles.card}>
          {config.options.map((option, index) => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={[styles.option, index > 0 && styles.optionBorder, isSelected && styles.optionSelected]}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
                {isSelected ? <Check size={20} color={colors.secondary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  title: { color: colors.text, fontFamily: 'Sora-Bold' },
  headerSpacer: { width: 22 },
  content: { padding: spacing.base },
  selectedHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  option: {
    minHeight: 56,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  optionSelected: { backgroundColor: 'rgba(124, 58, 237, 0.12)' },
  optionLabel: { ...typography.body, color: colors.textSecondary },
  optionLabelSelected: { color: colors.secondary, fontFamily: 'Inter-SemiBold' },
});