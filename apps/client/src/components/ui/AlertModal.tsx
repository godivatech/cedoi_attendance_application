import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export function AlertModal({ visible, title, message, buttons, onClose }: AlertModalProps) {
  if (!visible) return null;

  const handleButtonPress = (btn: AlertButton) => {
    onClose();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const hasButtons = buttons && buttons.length > 0;
  const isDestructive = title.toLowerCase().includes('error') || title.toLowerCase().includes('delete');

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.alertBox}>
          {/* Header Accent Bar */}
          <View style={[styles.accentBar, isDestructive ? styles.accentDestructive : styles.accentDefault]} />
          
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {hasButtons ? (
              buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isBtnDestructive = btn.style === 'destructive';
                
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[
                      styles.button,
                      buttons.length > 1 ? styles.buttonFlex : styles.buttonFull,
                      isCancel ? styles.buttonCancel : isBtnDestructive ? styles.buttonDestructive : styles.buttonPrimary,
                      index > 0 ? { marginLeft: 8 } : {}
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel ? styles.textCancel : { color: '#ffffff' }
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.button, styles.buttonFull, styles.buttonPrimary]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: '#ffffff' }]}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Slate 900 semi-transparent
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  accentDefault: {
    backgroundColor: '#4f46e5', // Indigo 600
  },
  accentDestructive: {
    backgroundColor: '#ef4444', // Red 500
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  button: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonFull: {
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
  },
  buttonCancel: {
    backgroundColor: '#f1f5f9',
  },
  buttonDestructive: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  textCancel: {
    color: '#475569',
  },
});
