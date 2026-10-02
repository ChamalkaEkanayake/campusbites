import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// Inject root styles for React Native Web to prevent 0-height blank screens
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(
    document.createTextNode(`
      html, body, #root {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }
    `)
  );
  document.head.appendChild(style);
}

registerRootComponent(App);
