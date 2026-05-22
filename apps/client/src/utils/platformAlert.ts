import { Alert as RNAlert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

type AlertCallback = (title: string, message?: string, buttons?: AlertButton[]) => void;
let globalAlertCallback: AlertCallback | null = null;

export function registerAlertHandler(callback: AlertCallback) {
  globalAlertCallback = callback;
}

export function unregisterAlertHandler() {
  globalAlertCallback = null;
}

/**
 * Platform-agnostic alert dialog utility.
 * Triggers the registered custom UI-based alert modal if available,
 * otherwise falls back to platform default.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (globalAlertCallback) {
    globalAlertCallback(title, message, buttons);
    return;
  }

  if (Platform.OS === 'web') {
    // Fallback console log
    console.log(`[Alert] ${title}: ${message}`);
    
    if (buttons && buttons.length > 0) {
      const confirmButton = buttons.find(b => b.style !== 'cancel') || buttons[0];
      const hasCancel = buttons.some(b => b.style === 'cancel');
      
      const proceed = hasCancel 
        ? window.confirm(`${title}\n\n${message || ''}`)
        : (window.alert(`${title}\n\n${message || ''}`), true);

      if (proceed && confirmButton?.onPress) {
        confirmButton.onPress();
      } else if (!proceed) {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }
    } else {
      window.alert(`${title}\n\n${message || ''}`);
    }
  } else {
    // Native iOS/Android implementation
    RNAlert.alert(title, message, buttons);
  }
}
