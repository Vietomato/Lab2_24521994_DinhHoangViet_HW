export type PlaybackResult = "ended" | "stopped";

export interface PlaybackHandle {
  readonly finished: Promise<PlaybackResult>;
  stop(): void;
}

export interface AudioEngine {
  readonly analyser: AnalyserNode | null;

  activate(): Promise<void>;
  decode(data: ArrayBuffer): Promise<AudioBuffer>;
  play(buffer: AudioBuffer): PlaybackHandle;
  dispose(): Promise<void>;
}