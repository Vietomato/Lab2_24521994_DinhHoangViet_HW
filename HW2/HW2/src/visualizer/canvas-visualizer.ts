export interface CanvasVisualizer {
  start(): void;
  stop(): void;
  dispose(): void;
}

export function createCanvasVisualizer(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
): CanvasVisualizer {
  const initialContext = canvas.getContext("2d");

  if (initialContext === null) {
    throw new Error("Không tạo được CanvasRenderingContext2D.");
  }

  analyser.fftSize = 512;

  let targetCanvas: HTMLCanvasElement | null = canvas;
  let context: CanvasRenderingContext2D | null = initialContext;
  let sourceAnalyser: AnalyserNode | null = analyser;

  // Cấp phát một lần: 512 / 2 = 256 bins.
  let frequencyData: Uint8Array<ArrayBuffer> | null =
    new Uint8Array(analyser.frequencyBinCount);

  let frameId: number | null = null;
  let running = false;
  let disposed = false;

  function drawFrame(): void {
    // Callback hiện tại không còn là frame đang chờ.
    frameId = null;

    const target = targetCanvas;
    const ctx = context;
    const node = sourceAnalyser;
    const values = frequencyData;

    if (
      !running ||
      disposed ||
      target === null ||
      ctx === null ||
      node === null ||
      values === null
    ) {
      return;
    }

    // Tránh âm thầm vẽ sai nếu module khác đổi cấu hình FFT.
    if (node.fftSize !== 512) {
      stop();
      console.error(
        "Visualizer đã dừng: fftSize phải giữ bằng 512.",
      );
      return;
    }

    node.getByteFrequencyData(values);

    const width = target.width;
    const height = target.height;
    const binWidth = width / values.length;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#005fcc";

    for (let index = 0; index < values.length; index += 1) {
      const magnitude = values[index] ?? 0;
      const barHeight = (magnitude / 255) * height;

      ctx.fillRect(
        index * binWidth,
        height - barHeight,
        binWidth * 0.8,
        barHeight,
      );
    }

    // Chỉ lên lịch một frame tiếp theo.
    frameId = requestAnimationFrame(drawFrame);
  }

  function start(): void {
    if (disposed) {
      throw new DOMException(
        "Visualizer đã được dispose.",
        "InvalidStateError",
      );
    }

    // Gọi start lặp không tạo thêm vòng vẽ.
    if (running) {
      return;
    }

    running = true;
    frameId = requestAnimationFrame(drawFrame);
  }

  function stop(): void {
    running = false;

    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function dispose(): void {
    if (disposed) {
      return;
    }

    disposed = true;
    stop();

    if (context !== null && targetCanvas !== null) {
      context.clearRect(
        0,
        0,
        targetCanvas.width,
        targetCanvas.height,
      );
    }

    frequencyData = null;
    sourceAnalyser = null;
    context = null;
    targetCanvas = null;
  }

  return {
    start,
    stop,
    dispose,
  };
}