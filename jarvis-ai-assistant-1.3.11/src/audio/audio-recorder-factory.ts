/**
 * Returns the platform-appropriate audio recorder. macOS keeps using the
 * existing native AVFoundation recorder unchanged; Windows/Linux get the
 * naudiodon2-based cross-platform recorder. Both classes expose the same
 * public shape (start/stop/cleanup/recording), so callers don't need to
 * branch on platform themselves.
 */
import { NativeAudioRecorder } from './native-audio-recorder';
import { CrossPlatformAudioRecorder } from './cross-platform-audio-recorder';

export type AudioRecorder = NativeAudioRecorder | CrossPlatformAudioRecorder;

export function createAudioRecorder(): AudioRecorder {
  if (process.platform === 'darwin') {
    return new NativeAudioRecorder();
  }
  return new CrossPlatformAudioRecorder();
}
