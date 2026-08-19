import { type ReactNode } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface ScreenLayoutProps {
  children: ReactNode;
  /** Whether to wrap children in a ScrollView (for long forms/pages). */
  scroll?: boolean;
  /** Extra styles for the inner content container. */
  style?: StyleProp<ViewStyle>;
  /** Whether to apply KeyboardAvoidingView (default true on forms). */
  avoidKeyboard?: boolean;
  /** Background color. */
  backgroundColor?: string;
  /** Whether to pad the bottom inset (set false if a tab bar covers it). */
  bottomInset?: boolean;
}

export function ScreenLayout({
  children,
  scroll = false,
  style,
  avoidKeyboard = false,
  backgroundColor = colors.background,
  bottomInset = true,
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: bottomInset ? insets.bottom + 16 : 24 },
        style,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingBottom: bottomInset ? insets.bottom : 0 }, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});
