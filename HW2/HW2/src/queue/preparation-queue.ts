import { PREPARATION_CONCURRENCY } from "../contracts/preparation";
import type {
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
  taken: boolean;
  settled: boolean;

  readonly resolvePrepared: (
    outcome: PreparationOutcome,
  ) => void;
}

// Phân biệt ID giữa các queue trong cùng vòng đời module.
let nextQueueId = 0;

export function createPreparationQueue({
  engine,
  fetchAudio = url => fetch(url),
}: PreparationDependencies): PreparationQueue {
  const queueId = ++nextQueueId;
  const tasks: TaskRecord[] = [];

  let nextSequence = 0;
  let activePreparations = 0;

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

  async function prepare(task: TaskRecord): Promise<void> {
    try {
      const response = await fetchAudio(task.track.url);

      if (!response.ok) {
        throw new Error(
          `Không tải được "${task.track.title}": HTTP ${response.status}`,
        );
      }

      const bytes = await response.arrayBuffer();
      const buffer = await engine.decode(bytes);

      task.buffer = buffer;
      task.status = "ready";

      settle(task, {
        status: "ready",
        taskId: task.id,
      });
    } catch (cause: unknown) {
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
      // Slot chỉ được trả sau toàn bộ fetch + đọc body + decode.
      activePreparations -= 1;
      pump();
    }
  }

  function pump(): void {
    while (activePreparations < PREPARATION_CONCURRENCY) {
      // tasks giữ nguyên thứ tự enqueue.
      const nextTask = tasks.find(task => task.status === "queued");

      if (nextTask === undefined) {
        return;
      }

      // Đặt trạng thái và chiếm slot trước khi bắt đầu async.
      nextTask.status = "loading";
      activePreparations += 1;

      // prepare tự xử lý lỗi fetch/decode.
      void prepare(nextTask);
    }
  }

  function enqueue(
    track: PreparationTrack,
  ): PreparationHandle {
    const sequence = nextSequence++;
    const id = `queue-${queueId}-task-${sequence}`;

    let resolvePrepared!: (
      outcome: PreparationOutcome,
    ) => void;

    const prepared = new Promise<PreparationOutcome>(resolve => {
      resolvePrepared = resolve;
    });

    const task: TaskRecord = {
      id,

      // Chụp lại metadata, tránh caller thay đổi object gốc.
      track: {
        title: track.title,
        url: track.url,
      },

      sequence,
      status: "queued",
      error: null,
      buffer: null,
      taken: false,
      settled: false,
      resolvePrepared,
    };

    tasks.push(task);
    pump();

    return { id, prepared };
  }

  function takeNextReady(): PreparedTrack | null {
    // Bỏ qua task lỗi và kết quả đã được lấy.
    const nextTask = tasks.find(
      task => !task.taken && task.status !== "error",
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

    // Chuyển quyền giữ buffer cho bên nhận kết quả.
    nextTask.buffer = null;

    return result;
  }

  function getSnapshot(): PreparationSnapshot {
    return {
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

  return {
    enqueue,
    takeNextReady,
    getSnapshot,
  };
}