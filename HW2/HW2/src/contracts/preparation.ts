import type { AudioEngine } from "./audio";

export interface PreparationTrack {
  readonly title: string;
  readonly url: string;
}

export type PreparationStatus =
  | "queued"
  | "loading"
  | "ready"
  | "error";

export type PreparationOutcome =
  | {
      readonly status: "ready";
      readonly taskId: string;
    }
  | {
      readonly status: "error";
      readonly taskId: string;
      readonly error: Error;
    };

export interface PreparationHandle {
  readonly id: string;

  // Resolve đúng một lần khi chuẩn bị thành công hoặc thất bại.
  readonly prepared: Promise<PreparationOutcome>;
}

export interface PreparedTrack {
  readonly id: string;
  readonly track: PreparationTrack;
  readonly sequence: number;
  readonly buffer: AudioBuffer;
}

export interface PreparationSnapshot {
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

  // Cho phép thay bằng fetch giả khi kiểm tra.
  readonly fetchAudio?: (url: string) => Promise<Response>;
}

export interface PreparationQueue {
  enqueue(track: PreparationTrack): PreparationHandle;

  // Lấy kết quả theo FIFO.
  // Trả null nếu đầu hàng còn đang chuẩn bị hoặc không còn kết quả.
  takeNextReady(): PreparedTrack | null;

  getSnapshot(): PreparationSnapshot;
}

export const PREPARATION_CONCURRENCY = 2;