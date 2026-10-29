import type { AudioEngine } from "./audio";

export interface PreparationTrack {
  readonly title: string;
  readonly url: string;
}

export type PreparationStatus =
  | "queued"
  | "loading"
  | "ready"
  | "error"
  | "cancelled";

export type PreparationCancellationReason =
  | "user"
  | "queue-disposed";

export type PreparationOutcome =
  | {
      readonly status: "ready";
      readonly taskId: string;
    }
  | {
      readonly status: "error";
      readonly taskId: string;
      readonly error: Error;
    }
  | {
      readonly status: "cancelled";
      readonly taskId: string;
      readonly reason: PreparationCancellationReason;
    };

export interface PreparationHandle {
  readonly id: string;
  readonly prepared: Promise<PreparationOutcome>;

  cancel(): boolean;
}

export interface PreparedTrack {
  readonly id: string;
  readonly track: PreparationTrack;
  readonly sequence: number;
  readonly buffer: AudioBuffer;
}

export interface PreparationSnapshot {
  readonly disposed: boolean;
  readonly activePreparations: number;

  readonly tasks: readonly {
    readonly id: string;
    readonly track: PreparationTrack;
    readonly sequence: number;
    readonly status: PreparationStatus;
    readonly error: Error | null;
    readonly taken: boolean;
  }[];
}

export interface PreparationDependencies {
  readonly engine: Pick<AudioEngine, "decode">;

  readonly fetchAudio?: (
    url: string,
    signal: AbortSignal,
  ) => Promise<Response>;
}

export interface PreparationQueue {
  enqueue(track: PreparationTrack): PreparationHandle;

  takeNextReady(): PreparedTrack | null;

  cancel(taskId: string): boolean;

  getSnapshot(): PreparationSnapshot;

  dispose(): Promise<void>;
}

export const PREPARATION_CONCURRENCY = 2;