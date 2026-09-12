/**
 * Cross-platform microphone recorder for Windows and Linux.
 *
 * The macOS build captures audio via a native AVFoundation addon
 * (audio_capture.mm). This is the Windows/Linux equivalent, using
 * `naudiodon2` (a maintained PortAudio binding with prebuilt binaries for
 * win32/linux/darwin).
 *
 * Output format matches NativeAudioRecorder exactly: 16kHz, mono, 16-bit
 * signed little-endian PCM — the format the rest of the app (Deepgram/
 * OpenAI transcription) already expects, so no downstream code needs to
 * change.
 *
 * NEEDS REAL-HARDWARE TESTING: I don't have a Windows or Linux machine to
 * verify actual microphone permission prompts or device selection here.
 * On Linux specifically, naudiodon2 talks to whatever PortAudio backend
 * is available (ALSA/PulseAudio); if no default input device is
 * configured, `getDevices()` may return an empty list and `start()` will
 * throw — please test on real hardware and report back.
 */

import { Logger } from '../core/logger';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export class CrossPlatformAudioRecorder {
  private ad: any;
  private audioInput: any = null;
  private isRecording = false;
  private audioChunks: Buffer[] = [];
  private recordingStartTime = 0;
  private onAudioLevel?: (level: number) => void;

  constructor() {
    try {
      // eval('require') bypasses webpack's static require analysis, same
      // pattern used by the existing native module loaders in this repo.
      this.ad = eval('require')('naudiodon2');
      Logger.success('✅ [CrossPlatformAudio] naudiodon2 loaded successfully');
    } catch (error) {
      Logger.error('❌ [CrossPlatformAudio] Failed to load naudiodon2:', error);
      throw new Error('Cross-platform audio recording not available');
    }
  }

  async start(
    onAudioLevel?: (level: number) => void,
    onChunk?: (buf: Buffer) => void
  ): Promise<void> {
    if (this.isRecording) {
      Logger.warning('⚠️ [CrossPlatformAudio] Already recording');
      return;
    }

    this.onAudioLevel = onAudioLevel;
    this.audioChunks = [];
    this.recordingStartTime = Date.now();

    try {
      this.audioInput = new this.ad.AudioIO({
        inOptions: {
          channelCount: CHANNELS,
          sampleFormat: this.ad.SampleFormat16Bit,
          sampleRate: SAMPLE_RATE,
          deviceId: -1, // default input device
          closeOnError: false,
        },
      });

      this.audioInput.on('data', (chunk: Buffer) => {
        this.audioChunks.push(chunk);
        onChunk?.(chunk);

        if (this.onAudioLevel) {
          this.onAudioLevel(this.computeLevel(chunk));
        }
      });

      this.audioInput.on('error', (err: Error) => {
        Logger.error('❌ [CrossPlatformAudio] Stream error:', err);
      });

      this.audioInput.start();
      this.isRecording = true;
      Logger.success('✅ [CrossPlatformAudio] Recording started');
    } catch (error) {
      Logger.error('❌ [CrossPlatformAudio] Failed to start recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  stop(): Buffer | null {
    if (!this.isRecording) return null;

    try {
      this.audioInput?.quit();
      this.isRecording = false;

      const totalSize = this.audioChunks.reduce((sum, c) => sum + c.length, 0);
      const pcmBuffer = Buffer.concat(this.audioChunks, totalSize);
      const duration = Date.now() - this.recordingStartTime;

      Logger.success(
        `🎵 [CrossPlatformAudio] Captured ${pcmBuffer.length} bytes ` +
        `Linear16 PCM (${duration}ms)`
      );

      this.audioChunks = [];
      this.audioInput = null;
      return pcmBuffer;
    } catch (error) {
      Logger.error('❌ [CrossPlatformAudio] Error stopping recording:', error);
      this.audioChunks = [];
      this.audioInput = null;
      return null;
    }
  }

  cleanup(): void {
    if (this.isRecording) {
      this.stop();
    }
  }

  get recording(): boolean {
    return this.isRecording;
  }

  /** Rough RMS-based level meter, 0.0–1.0, for UI feedback only. */
  private computeLevel(chunk: Buffer): number {
    if (chunk.length < 2) return 0;
    let sumSquares = 0;
    const sampleCount = chunk.length / 2;
    for (let i = 0; i < chunk.length; i += 2) {
      const sample = chunk.readInt16LE(i);
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / sampleCount);
    return Math.min(1, rms / 32768);
  }
}
