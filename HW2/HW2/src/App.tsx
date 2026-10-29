import { useEffect, useRef, useState } from "react";
import { createAudioSession } from "./player/audio-session";
import type { PlayerView } from "./player/audio-session";
import "./App.css";

const statusLabels = {
  queued: "Đang chờ",
  loading: "Đang tải / giải mã",
  ready: "Sẵn sàng",
  playing: "Đang phát",
  completed: "Hoàn tất",
  cancelled: "Đã hủy / dừng",
  error: "Lỗi",
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<
    ReturnType<typeof createAudioSession> | null
  >(null);

  const [title, setTitle] = useState("Demo");
  const [url, setUrl] = useState("/audio/demo.mp3");

  const [view, setView] = useState<PlayerView>({
    ready: false,
    initializing: false,
    running: false,
    activePreparations: 0,
    message: "Hãy khởi tạo âm thanh trước khi thêm bài.",
    tasks: [],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const session = createAudioSession(canvas, setView);
    sessionRef.current = session;

    return () => {
      if (sessionRef.current === session) {
        sessionRef.current = null;
      }

      void session.dispose().catch(error => {
        console.error("Cleanup audio session thất bại:", error);
      });
    };
  }, []);

  const hasPending = view.tasks.some(
    task =>
      task.status === "queued" ||
      task.status === "loading" ||
      task.status === "ready",
  );

  return (
    <main className="audio-app">
      <h1>Concurrent FIFO Audio Visualizer</h1>

      <button
        type="button"
        disabled={view.ready || view.initializing}
        onClick={() => {
          void sessionRef.current?.initialize();
        }}
      >
        {view.initializing
          ? "Đang khởi tạo..."
          : view.ready
            ? "Âm thanh đã sẵn sàng"
            : "Khởi tạo âm thanh"}
      </button>

      <form
        onSubmit={event => {
          event.preventDefault();

          const cleanTitle = title.trim();
          const cleanUrl = url.trim();

          if (!cleanTitle || !cleanUrl) return;

          sessionRef.current?.enqueue({
            title: cleanTitle,
            url: cleanUrl,
          });
        }}
      >
        <div className="field">
          <label htmlFor="track-title">Tên bài</label>
          <input
            id="track-title"
            required
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="track-url">Đường dẫn âm thanh</label>
          <input
            id="track-url"
            required
            value={url}
            onChange={event => setUrl(event.target.value)}
            aria-describedby="track-url-help"
          />
          <small id="track-url-help">
            Ví dụ: /audio/demo.mp3. URL ngoài cần cho phép CORS.
          </small>
        </div>

        <button
          type="submit"
          disabled={!view.ready || !title.trim() || !url.trim()}
        >
          Thêm bài
        </button>
      </form>

      <div className="controls">
        <button
          type="button"
          disabled={!view.ready || view.running || !hasPending}
          onClick={() => {
            void sessionRef.current?.play();
          }}
        >
          Phát hàng đợi
        </button>

        <button
          type="button"
          disabled={!view.running}
          onClick={() => sessionRef.current?.stop()}
        >
          Dừng
        </button>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true">
        {view.message}
      </p>

      <p>
        Tác vụ đang chuẩn bị: {view.activePreparations} / 2
      </p>

      <figure>
        <canvas
          ref={canvasRef}
          width={768}
          height={256}
          role="img"
          aria-label="Phổ tần số của bài đang phát"
        >
          Trình duyệt không hỗ trợ Canvas.
        </canvas>
        <figcaption>
          Phổ tần số — trạng thái phát được mô tả bằng văn bản phía trên.
        </figcaption>
      </figure>

      <section aria-labelledby="queue-title">
        <h2 id="queue-title">Danh sách tác vụ</h2>

        {view.tasks.length === 0 ? (
          <p>Chưa có bài trong hàng đợi.</p>
        ) : (
          <ol className="task-list">
            {view.tasks.map(task => {
              const cancellable =
                task.status === "queued" ||
                task.status === "loading" ||
                task.status === "ready" ||
                task.status === "playing";

              return (
                <li key={task.id}>
                  <strong>{task.track.title}</strong>
                  <p>{statusLabels[task.status]}</p>

                  {task.detail && (
                    <p className="task-detail">{task.detail}</p>
                  )}

                  <button
                    type="button"
                    disabled={!cancellable}
                    aria-label={`Hủy ${task.track.title}, tác vụ ${task.sequence + 1}`}
                    onClick={() => sessionRef.current?.cancel(task.id)}
                  >
                    Hủy
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}