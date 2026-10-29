import { createAudioEngine } from "../audio/audio-engine";
import type { PlaybackHandle } from "../contracts/audio";
import type {
  PreparationSnapshot,
  PreparationStatus,
  PreparationTrack,
} from "../contracts/preparation";
import { createPreparationQueue } from "../queue/preparation-queue";
import {
  createCanvasVisualizer,
} from "../visualizer/canvas-visualizer";
import type {
  CanvasVisualizer,
} from "../visualizer/canvas-visualizer";

type DisplayStatus =
  | PreparationStatus
  | "playing"
  | "completed";

type PreparationRow = PreparationSnapshot["tasks"][number];

export type PlayerRow = Omit<PreparationRow, "status"> & {
  readonly status: DisplayStatus;
  readonly detail: string;
};

export interface PlayerView {
  readonly ready: boolean;
  readonly initializing: boolean;
  readonly running: boolean;
  readonly activePreparations: number;
  readonly message: string;
  readonly tasks: readonly PlayerRow[];
}

interface PlaybackState {
  readonly id: string;
  readonly title: string;
  readonly handle: PlaybackHandle;
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "EncodingError") {
    return "Không giải mã được file. Hãy kiểm tra định dạng âm thanh.";
  }

  return error instanceof Error ? error.message : String(error);
}

export function createAudioSession(
  canvas: HTMLCanvasElement,
  onChange: (view: PlayerView) => void,
) {
  const engine = createAudioEngine();
  const queue = createPreparationQueue({ engine });

  const displayStates = new Map<
    string,
    { status: DisplayStatus; detail: string }
  >();

  let visualizer: CanvasVisualizer | null = null;
  let active: PlaybackState | null = null;

  let ready = false;
  let initializing = false;
  let running = false;
  let canPlay = false;
  let disposed = false;
  let requestVersion = 0;

  let message = "Hãy khởi tạo âm thanh trước khi thêm bài.";
  let lastPublished = "";
  let disposal: Promise<void> | null = null;

  function publish(): void {
    if (disposed) return;

    const snapshot = queue.getSnapshot();

    const view: PlayerView = {
      ready,
      initializing,
      running,
      activePreparations: snapshot.activePreparations,
      message,
      tasks: snapshot.tasks.map(task => {
        const display = displayStates.get(task.id);

        return {
          ...task,
          status: display?.status ?? task.status,
          detail:
            display?.detail ??
            (task.error === null ? "" : errorMessage(task.error)),
        };
      }),
    };

    // Không render React lại nếu snapshot không thay đổi.
    const signature = JSON.stringify(view);

    if (signature !== lastPublished) {
      lastPublished = signature;
      onChange(view);
    }
  }

  function pumpPlayback(): void {
    if (disposed || !running || !canPlay || active !== null) {
      return;
    }

    for (;;) {
      const candidate = queue.takeNextReady();

      if (candidate === null) {
        const pending = queue.getSnapshot().tasks.some(
          task =>
            !task.taken &&
            (task.status === "queued" ||
              task.status === "loading" ||
              task.status === "ready"),
        );

        if (pending) {
          message = "Đang chờ bài tiếp theo theo thứ tự FIFO.";
        } else {
          running = false;
          canPlay = false;
          message = "Đã xử lý hết hàng đợi.";
        }

        return;
      }

      try {
        const handle = engine.play(candidate.buffer);

        const current: PlaybackState = {
          id: candidate.id,
          title: candidate.track.title,
          handle,
        };

        active = current;

        displayStates.set(current.id, {
          status: "playing",
          detail: "",
        });

        message = `Đang phát: ${current.title}`;

        // Đăng ký ngay để xử lý cả promise phát bị reject.
        void handle.finished.then(
          result => {
            if (disposed || active !== current) return;

            active = null;
            visualizer?.stop();

            displayStates.set(current.id, {
              status: result === "ended" ? "completed" : "cancelled",
              detail:
                result === "ended" ? "" : "Lượt phát đã dừng.",
            });

            pumpPlayback();
            publish();
          },
          error => {
            if (disposed || active !== current) return;

            active = null;
            visualizer?.stop();

            displayStates.set(current.id, {
              status: "error",
              detail: errorMessage(error),
            });

            pumpPlayback();
            publish();
          },
        );

        visualizer?.start();
        return;
      } catch (error: unknown) {
        // Nếu lỗi sau khi tạo playback, dọn nó trước.
        const failed = active;
        active = null;
        failed?.handle.stop();
        visualizer?.stop();

        displayStates.set(candidate.id, {
          status: "error",
          detail: errorMessage(error),
        });

        // Thử ứng viên kế tiếp, không để lỗi làm kẹt hàng đợi.
      }
    }
  }

  async function initialize(): Promise<void> {
    if (disposed || initializing || ready) return;

    initializing = true;
    message = "Đang khởi tạo âm thanh.";
    publish();

    try {
      await engine.activate();

      if (disposed) return;

      const analyser = engine.analyser;

      if (analyser === null) {
        throw new Error("Engine chưa cung cấp AnalyserNode.");
      }

      visualizer = createCanvasVisualizer(canvas, analyser);
      ready = true;
      message = "Sẵn sàng. Thêm bài rồi bấm Phát hàng đợi.";
    } catch (error: unknown) {
      if (!disposed) {
        message = `Khởi tạo thất bại: ${errorMessage(error)}`;
      }
    } finally {
      initializing = false;
      publish();
    }
  }

  function enqueue(track: PreparationTrack): void {
    if (disposed || !ready) return;

    try {
      const handle = queue.enqueue(track);

      message = `Đã thêm: ${track.title}`;

      void handle.prepared.then(outcome => {
        if (disposed) return;

        if (outcome.status === "error") {
          message = `Chuẩn bị thất bại: ${track.title}`;
        }

        pumpPlayback();
        publish();
      });

      publish();
    } catch (error: unknown) {
      message = errorMessage(error);
      publish();
    }
  }

  async function play(): Promise<void> {
    if (disposed || !ready || running) return;

    const version = ++requestVersion;
    running = true;
    canPlay = false;
    message = "Đang chuẩn bị phát.";
    publish();

    try {
      // Resume lại nếu context bị suspended.
      await engine.activate();

      if (disposed || version !== requestVersion) return;

      canPlay = true;
      pumpPlayback();
      publish();
    } catch (error: unknown) {
      if (disposed || version !== requestVersion) return;

      running = false;
      canPlay = false;
      message = `Không thể phát: ${errorMessage(error)}`;
      publish();
    }
  }

  function stop(): void {
    if (disposed) return;

    requestVersion += 1;
    running = false;
    canPlay = false;

    const previous = active;
    active = null;

    visualizer?.stop();

    if (previous !== null) {
      displayStates.set(previous.id, {
        status: "cancelled",
        detail: "Đã dừng. Thêm lại bài nếu muốn phát từ đầu.",
      });

      previous.handle.stop();
    }

    message = "Đã dừng phát. Các bài chưa phát vẫn giữ trong hàng đợi.";
    publish();
  }

  function cancel(taskId: string): void {
    if (disposed) return;

    if (active?.id === taskId) {
      const previous = active;
      active = null;

      displayStates.set(taskId, {
        status: "cancelled",
        detail: "Đã hủy khi đang phát.",
      });

      visualizer?.stop();
      previous.handle.stop();

      pumpPlayback();
    } else {
      queue.cancel(taskId);
      pumpPlayback();
    }

    publish();
  }

  const timer = window.setInterval(() => {
    pumpPlayback();
    publish();
  }, 200);

  function dispose(): Promise<void> {
    if (disposal !== null) return disposal;

    disposed = true;
    requestVersion += 1;
    running = false;
    canPlay = false;

    window.clearInterval(timer);

    visualizer?.dispose();
    visualizer = null;

    const previous = active;
    active = null;
    previous?.handle.stop();

    displayStates.clear();

    disposal = (async () => {
      try {
        // Giữ engine sống cho đến khi decode thực sự kết thúc.
        await queue.dispose();
      } finally {
        await engine.dispose();
      }
    })();

    return disposal;
  }

  return {
    initialize,
    enqueue,
    play,
    stop,
    cancel,
    dispose,
  };
}