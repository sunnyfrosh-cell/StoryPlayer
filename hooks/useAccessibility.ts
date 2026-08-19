import { Platform } from 'react-native';

export const MIN_TOUCH_TARGET = 44;

interface AccessibilityConfig {
  label?: string;
  role?: 'button' | 'link' | 'image' | 'header' | 'text' | 'search' | 'adjustable';
  hint?: string;
  state?: {
    disabled?: boolean;
    selected?: boolean;
    expanded?: boolean;
    busy?: boolean;
  };
}

export function useAccessibility(config: AccessibilityConfig) {
  const a11yProps: Record<string, unknown> = {};

  if (config.label) {
    a11yProps.accessibilityLabel = config.label;
  }
  if (config.role) {
    if (Platform.OS === 'web') {
      a11yProps.role = config.role;
    } else {
      a11yProps.accessibilityRole = config.role;
    }
  }
  if (config.hint) {
    a11yProps.accessibilityHint = config.hint;
  }
  if (config.state) {
    if (config.state.disabled !== undefined) {
      a11yProps.accessibilityState = {
        ...(a11yProps.accessibilityState as Record<string, unknown>),
        disabled: config.state.disabled,
      };
    }
    if (config.state.selected !== undefined) {
      a11yProps.accessibilityState = {
        ...(a11yProps.accessibilityState as Record<string, unknown>),
        selected: config.state.selected,
      };
    }
    if (config.state.expanded !== undefined) {
      a11yProps.accessibilityState = {
        ...(a11yProps.accessibilityState as Record<string, unknown>),
        expanded: config.state.expanded,
      };
    }
    if (config.state.busy !== undefined) {
      a11yProps.accessibilityState = {
        ...(a11yProps.accessibilityState as Record<string, unknown>),
        busy: config.state.busy,
      };
    }
  }

  return a11yProps;
}

export function minTouchTargetStyle(size: number = MIN_TOUCH_TARGET) {
  return {
    minWidth: size,
    minHeight: size,
  };
}
