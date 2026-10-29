import { PREPARATION_CONCURRENCY } from "../contracts/preparation";
import type {
  PreparationCancellationReason,
  PreparationDependencies,
  PreparationHandle,
  PreparationOutcome,
  PreparationQueue,
  PreparationSnapshot,
  PreparationStatus,
  PreparationTrack,
  PreparedTrack,
} from "../contracts/preparation";

interface TaskRecord {
  readonly id: string;
  readonly track: PreparationTrack;
  readonly sequence: number;

  status: PreparationStatus;
  error: Error | null;
  buffer: AudioBuffer | null;
  controller: AbortController | null;
  taken: boolean;
  settled: boolean;

  readonly resolvePrepared: (
    outcome: PreparationOutcome,
  ) => void;
}

let nextQueueId = 0;

export function createPreparationQueue({
  engine,
  fetchAudio = (url, signal) => fetch(url, { signal }),
}: PreparationDependencies): PreparationQueue {
  const queueId = ++nextQueueId;
  const tasks: TaskRecord[] = [];

  // Theo dõi các thao tác thật để dispose có thể chờ chúng.
  const operations = new Set<Promise<void>>();

  let nextSequence = 0;
  let activePreparations = 0;
  let disposed = false;
  let disposePromise: Promise<void> | null = null;

  function settle(
    task: TaskRecord,
    outcome: PreparationOutcome,
  ): void {
    if (task.settled) {
      return;
    }

    task.settled = true;
    task.resolvePrepared(outcome);
  }

  function canContinue(task: TaskRecord): boolean {
    return !disposed && task.status === "loading";
  }

  function cancelTask(
    task: TaskRecord,
    reason: PreparationCancellationReason,
  ): boolean {
    if (
      task.taken ||
      task.status === "cancelled" ||
      task.status === "error"
    ) {
      return false;
    }

    task.status = "cancelled";
    task.buffer = null;

    settle(task, {
      status: "cancelled",
      taskId: task.id,
      reason,
    });

    // Không giảm activePreparations ở đây.
    task.controller?.abort();

    return true;
  }

  async function prepare(task: TaskRecord): Promise<void> {
    try {
      if (!canContinue(task) || task.controller === null) {
        return;
      }

      const response = await fetchAudio(
        task.track.url,
        task.controller.signal,
      );

      if (!canContinue(task)) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Không tải được "${task.track.title}": HTTP ${response.status}`,
        );
      }

      const bytes = await response.arrayBuffer();

      if (!canContinue(task)) {
        return;
      }

      // Decode không nhận AbortSignal.
      const buffer = await engine.decode(bytes);

      // Không lưu buffer hoặc ghi ready nếu đã hủy/dispose.
      if (!canContinue(task)) {
        return;
      }

      task.buffer = buffer;
      task.status = "ready";

      settle(task, {
        status: "ready",
        taskId: task.id,
      });
    } catch (cause: unknown) {
      // Lỗi đến muộn sau cancellation không đổi cancelled thành error.
      if (!canContinue(task)) {
        return;
      }

      const error =
        cause instanceof Error
          ? cause
          : new Error(String(cause));

      task.buffer = null;
      task.error = error;
      task.status = "error";

      settle(task, {
        status: "error",
        taskId: task.id,
        error,
      });
    } finally {
      task.controller = null;

      // Chỉ trả slot khi thao tác thật đã thoát.
      activePreparations -= 1;

      if (!disposed) {
        pump();
      }
    }
  }

  function pump(): void {
    if (disposed) {
      return;
    }

    while (activePreparations < PREPARATION_CONCURRENCY) {
      const nextTask = tasks.find(task => task.status === "queued");

      if (nextTask === undefined) {
        return;
      }

      nextTask.status = "loading";
      nextTask.controller = new AbortController();
      activePreparations += 1;

      // Đăng ký operation trước khi chạy fetch.
      const operation = Promise.resolve().then(() =>
        prepare(nextTask),
      );

      operations.add(operation);

      void operation.then(() => {
        operations.delete(operation);
      });
    }
  }

  function cancel(taskId: string): boolean {
    if (disposed) {
      return false;
    }

    const task = tasks.find(item => item.id === taskId);

    if (task === undefined) {
      return false;
    }

    const accepted = cancelTask(task, "user");

    if (accepted) {
      pump();
    }

    return accepted;
  }

  function enqueue(
    track: PreparationTrack,
  ): PreparationHandle {
    if (disposed) {
      throw new DOMException(
        "Preparation queue đã được dispose.",
        "InvalidStateError",
      );
    }

    const sequence = nextSequence++;
    const id = `queue-${queueId}-task-${sequence}`;

    let resolvePrepared!: (
      outcome: PreparationOutcome,
    ) => void;

    const prepared = new Promise<PreparationOutcome>(resolve => {
      resolvePrepared = resolve;
    });

    tasks.push({
      id,
      track: {
        title: track.title,
        url: track.url,
      },
      sequence,
      status: "queued",
      error: null,
      buffer: null,
      controller: null,
      taken: false,
      settled: false,
      resolvePrepared,
    });

    pump();

    return {
      id,
      prepared,
      cancel: () => cancel(id),
    };
  }

  function takeNextReady(): PreparedTrack | null {
    if (disposed) {
      return null;
    }

    const nextTask = tasks.find(
      task =>
        !task.taken &&
        task.status !== "error" &&
        task.status !== "cancelled",
    );

    if (
      nextTask === undefined ||
      nextTask.status !== "ready" ||
      nextTask.buffer === null
    ) {
      return null;
    }

    const result: PreparedTrack = {
      id: nextTask.id,
      track: { ...nextTask.track },
      sequence: nextTask.sequence,
      buffer: nextTask.buffer,
    };

    nextTask.taken = true;
    nextTask.buffer = null;

    return result;
  }

  function getSnapshot(): PreparationSnapshot {
    return {
      disposed,
      activePreparations,
      tasks: tasks.map(task => ({
        id: task.id,
        track: { ...task.track },
        sequence: task.sequence,
        status: task.status,
        error:
          task.error === null
            ? null
            : new Error(task.error.message),
        taken: task.taken,
      })),
    };
  }

  function dispose(): Promise<void> {
    if (disposePromise !== null) {
      return disposePromise;
    }

    let resolveDispose!: () => void;
    let rejectDispose!: (reason: unknown) => void;

    // Tạo promise trước khi abort, bảo đảm gọi lặp an toàn.
    disposePromise = new Promise<void>((resolve, reject) => {
      resolveDispose = resolve;
      rejectDispose = reject;
    });

    disposed = true;

    for (const task of tasks) {
      cancelTask(task, "queue-disposed");
    }

    // Queue không giữ lịch sử/buffer sau dispose.
    // Worker đang chạy vẫn giữ record riêng để hoàn tất cleanup.
    tasks.length = 0;

    void Promise.all([...operations]).then(
      () => {
        resolveDispose();
      },
      rejectDispose,
    );

    return disposePromise;
  }

  return {
    enqueue,
    takeNextReady,
    cancel,
    getSnapshot,
    dispose,
  };
}