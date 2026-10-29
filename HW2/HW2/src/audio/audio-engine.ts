import type {
  AudioEngine,
  PlaybackHandle,
  PlaybackResult,
} from "../contracts/audio";

export function createAudioEngine(): AudioEngine {
  let context: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let activePlayback: PlaybackHandle | null = null;

  let disposed = false;
  let disposePromise: Promise<void> | null = null;

  function assertUsable(): void {
    if (disposed) {
      throw new DOMException(
        "Audio engine đã được dispose.",
        "InvalidStateError",
      );
    }
  }

  function requireContext(): AudioContext {
    assertUsable();

    if (context === null || context.state === "closed") {
      throw new DOMException(
        "Hãy gọi activate() trước.",
        "InvalidStateError",
      );
    }

    return context;
  }

  async function activate(): Promise<void> {
    assertUsable();

    // Được tạo đồng bộ trong lần gọi từ sự kiện người dùng.
    if (context === null) {
      const ownedContext = new AudioContext();
      context = ownedContext;

      analyser = ownedContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.connect(ownedContext.destination);
    }

    const ownedContext = requireContext();

    if (ownedContext.state !== "running") {
      await ownedContext.resume();
    }

    // Có thể đã dispose trong lúc chờ resume.
    assertUsable();

    if (ownedContext.state !== "running") {
      throw new DOMException(
        "AudioContext chưa chuyển sang trạng thái running.",
        "InvalidStateError",
      );
    }
  }

  async function decode(data: ArrayBuffer): Promise<AudioBuffer> {
    const ownedContext = requireContext();

    // Decode bản sao để không detach ArrayBuffer của caller.
    const buffer = await ownedContext.decodeAudioData(data.slice(0));

    // Không trả kết quả đã hoàn thành muộn sau dispose.
    assertUsable();

    return buffer;
  }

  function play(buffer: AudioBuffer): PlaybackHandle {
    const ownedContext = requireContext();
    const ownedAnalyser = analyser;

    if (
      ownedContext.state !== "running" ||
      ownedAnalyser === null
    ) {
      throw new DOMException(
        "Hãy activate() để AudioContext chạy trước khi phát.",
        "InvalidStateError",
      );
    }

    if (activePlayback !== null) {
      throw new DOMException(
        "Đang có một lượt phát hoạt động.",
        "InvalidStateError",
      );
    }

    // Mỗi lần play tạo một source hoàn toàn mới.
    const source = ownedContext.createBufferSource();
    source.buffer = buffer;
    source.loop = false;

    let settled = false;
    let started = false;

    let resolveFinished!: (
      result: PlaybackResult,
    ) => void;

    let rejectFinished!: (
      reason: unknown,
    ) => void;

    const finished = new Promise<PlaybackResult>(
      (resolve, reject) => {
        resolveFinished = resolve;
        rejectFinished = reject;
      },
    );

    function release(): void {
      source.onended = null;
      source.disconnect();
      source.buffer = null;

      // Lượt phát cũ không được xóa trạng thái lượt mới.
      if (activePlayback === playback) {
        activePlayback = null;
      }
    }

    function finish(result: PlaybackResult): void {
      if (settled) {
        return;
      }

      settled = true;
      release();
      resolveFinished(result);
    }

    function fail(error: unknown): void {
      if (settled) {
        return;
      }

      settled = true;
      release();
      rejectFinished(error);
    }

    const playback: PlaybackHandle = {
      finished,

      stop(): void {
        if (settled) {
          return;
        }

        try {
          if (started) {
            source.stop();
          }

          // Không chờ onended mới giải phóng lượt phát.
          finish("stopped");
        } catch (error: unknown) {
          fail(error);
        }
      },
    };

    activePlayback = playback;

    source.onended = () => {
      if (settled || activePlayback !== playback) {
        return;
      }

      finish("ended");
    };

    try {
      source.connect(ownedAnalyser);
      source.start();
      started = true;
    } catch (error: unknown) {
      fail(error);
    }

    return playback;
  }

  function dispose(): Promise<void> {
    if (disposePromise !== null) {
      return disposePromise;
    }

    // Đánh dấu ngay để chặn các thao tác mới.
    disposed = true;

    activePlayback?.stop();
    activePlayback = null;

    analyser?.disconnect();
    analyser = null;

    const ownedContext = context;
    context = null;

    disposePromise =
      ownedContext === null || ownedContext.state === "closed"
        ? Promise.resolve()
        : ownedContext.close();

    return disposePromise;
  }

  return {
    get analyser(): AnalyserNode | null {
      return analyser;
    },

    activate,
    decode,
    play,
    dispose,
  };
}