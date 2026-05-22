import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Platform-agnostic alert dialog utility.
 * Avoids thread blocking window.alert behavior on Web where appropriate.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS === 'web') {
    // Web implementation
    console.log(`[Alert] ${title}: ${message}`);
    
    // Fallback to simple alert/confirm for now
    if (buttons && buttons.length > 0) {
      // Find default action or first button
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
