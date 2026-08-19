import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { Modal } from './Modal';
import { colors, spacing, radius, typography } from '@/theme';

export interface OptionItem {
  label: string;
  value: string;
}

interface OptionPickerModalProps {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedValue: string;
  onSelect: (value: string, label: string) => void;
  onClose: () => void;
}

export function OptionPickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: OptionPickerModalProps) {
  const handleSelect = useCallback(
    (option: OptionItem) => {
      onSelect(option.value, option.label);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;
          return (
            <Pressable
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleSelect(option)}
            >
              <Text
                style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {isSelected ? <Check size={20} color={colors.secondary} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

export function useOptionPicker(initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const [label, setLabel] = useState(initialValue);
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const select = useCallback((newValue: string, newLabel: string) => {
    setValue(newValue);
    setLabel(newLabel);
  }, []);

  return { value, label, visible, open, close, select, setValue };
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    minHeight: 52,
  },
  optionSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  optionLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.secondary,
    fontFamily: 'Inter-SemiBold',
  },
});
