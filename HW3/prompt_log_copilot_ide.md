# Copilot IDE Prompt Log

Conversation log for Task 2 through Task 4, including user prompts, assistant
responses, and a concise record of the workflow and verification. Times are local
to the conversation where available. Tool activity is summarized rather than
reproduced command-by-command.

## User — Task 2

> Làm task 2: countdown dựa trên deadline tuyệt đối.
>
> Mỗi lần cập nhật tính Math.max(0, endTime - Date.now()),
> không trừ dần theo interval.
> Hỗ trợ deadline thay đổi và cleanup; không tạo nhiều vòng lặp.
> Khi tab hoạt động lại, cập nhật từ deadline.
> Tách phép tính thời gian để có thể kiểm thử bằng đồng hồ giả.
> Chưa triển khai inventory.
>
> Commit: feat(timer): implement deadline countdown
>
> Nhớ đọc task_decomposition và project rule

## Assistant — Initial response

> Mình sẽ xem task decomposition, project rules và phần HW3 hiện có trước, rồi
> triển khai countdown và kiểm thử theo cấu trúc dự án.

## Assistant — Implementation updates

> Task 2 phù hợp để bổ sung module countdown độc lập; mình sẽ giữ nguyên trang
> hiện tại và không thêm phần inventory. Trước khi sửa, mình xác nhận quy ước lint
> và trạng thái riêng của HW3 để tránh đụng các thay đổi khác.

> Module và tài liệu đã được thêm, không nối vào UI hay inventory. Mình sẽ chạy
> typecheck, lint và build trên riêng HW3; nếu có lỗi về React effect hoặc kiểu
> timer thì sẽ xử lý trước khi commit.

> Typecheck, lint, build và phép tính với đồng hồ giả đều đạt. Countdown không còn
> lịch hẹn khi chạm 0, cập nhật khi deadline đổi hoặc tab hiện lại; mình đang rà
> soát phần staged để chỉ commit các file của Task 2.

## Assistant — Task 2 result

> Đã hoàn thành Task 2 và commit `8921b8e` — `feat(timer): implement deadline
> countdown`.
>
> - Thêm phép tính thời gian thuần, nhận đồng hồ giả và chặn kết quả âm.
> - Thêm hook countdown: tính lại từ deadline tuyệt đối, chỉ duy trì một timeout,
>   cập nhật khi tab hiện lại và cleanup timeout/listener.
> - Cập nhật checklist và tài liệu Task 2.
>
> Typecheck, lint, build và kiểm tra phép tính bằng đồng hồ giả đều đạt. Chưa thêm
> test runner cho lifecycle của hook; phần kiểm thử tự động được để dành cho Task
> 7. Không triển khai inventory hay tích hợp countdown vào UI. Các thay đổi sẵn có
> ngoài HW3 vẫn được giữ nguyên.

## User — Log request

> Từ task 2 tới giờ bạn sẽ tạo 1 file prompt_log_copilot_ide để lưu lại cuộc trò
> chuyện của tôi và bạn nx nhé

## Assistant — Log creation

Created this file at the user's request. It records the Task 2 prompt, assistant
updates and result, and the request to preserve this conversation.

## User — Task 3

> Làm task 3: triển khai pure reducer cho reservation lifecycle
> theo contract hiện có.
>
> Bao gồm IDLE, RESERVING, RESERVED, CHECKING_OUT,
> SUCCESS, EXPIRED và ERROR; xử lý hủy phù hợp.
> Định nghĩa rõ event và chuyển trạng thái hợp lệ.
> Lưu requestId, reservationId, expiresAt khi cần.
> Event hoặc response cũ không được ghi đè trạng thái mới.
> Không gọi API hoặc tạo timer bên trong reducer.
>
> Commit: feat(state): implement reservation lifecycle
>
> nhớ lưu prompt và câu trả lời, cách bạn làm việc vào promptlog

## Assistant — Work updates

> Mình sẽ đối chiếu contract, rule và prompt log hiện tại, rồi triển khai reducer
> thuần cho reservation lifecycle. Mình sẽ giữ nguyên những thay đổi chưa commit và
> chỉ đưa phần Task 3 vào commit được yêu cầu.
>
> Contract hiện có đã định nghĩa `CANCELLING` và trạng thái lỗi riêng cho
> reserve/checkout/cancel. Mình sẽ giữ nguyên các kiểu trạng thái đó, thêm event
> union và reducer thuần; response chỉ được chấp nhận nếu `requestId` và
> reservation đang hoạt động khớp.
>
> Reducer đã có chuyển trạng thái tường minh, gồm retry, hủy và hết hạn. Mình cũng
> giới hạn `RESET` để không thể bỏ quên một hold còn hiệu lực; tiếp theo mình kiểm
> tra type/lint/build và chạy các event sequence đại diện, gồm response cũ.

## Assistant — Implementation and verification record

- Read the HW3 task decomposition, project rules, Task 1 contract decisions, and
  the existing discriminated `ReservationState` before editing.
- Added `src/state/reservation-reducer.ts` with a typed event union and pure
  reducer. It ignores illegal transitions and mismatched request IDs, reservation
  IDs, or expiry deadlines. API work, timer creation, and clock reads remain
  outside the reducer.
- Added `docs/task3-reservation-reducer.md` describing transition rules, retry
  identity, cancellation, expiry, and in-flight checkout behavior; marked Task 3
  implementation checklist items complete.
- Verification observed: `npm run typecheck`, `npm run lint`,
  `npm run build`, and controlled Node event-sequence assertions passed. The
  sequences covered stale reserve/cancel responses, reserve retry, checkout
  success/failure/retry, cancellation success/failure/retry, expiry, and refusal
  to reset while a hold is active.
- No inventory implementation or UI integration was added.

## Assistant — Task 3 result

Committed the lifecycle reducer with the requested message:
`feat(state): implement reservation lifecycle`.

## User — Task 4

> Làm task 4: mock service có shared state cho sản phẩm tồn 10,
> reserve, cancel, expire và checkout.
>
> Reservation giữ 1 đơn vị trong 30 giây.
> Kiểm tra và cập nhật tồn kho trong cùng thao tác đồng bộ,
> không chèn await giữa kiểm tra tồn và trừ tồn.
> Độ trễ mô phỏng nằm ngoài đoạn cập nhật nguyên tử này.
>
> Không bán vượt tồn; hoàn tồn tối đa một lần.
> Checkout kiểm tra expiry và có idempotency.
> Quy định rõ checkout và expiry cạnh tranh thì bên nào thắng.
> Cho phép truyền clock, delay và cơ chế gây lỗi để test xác định,
> không bắt tests phụ thuộc Math.random hoặc mạng thật.
> Có dispose nếu service sở hữu timer.
>
> Commit: feat(service): implement inventory simulation
>
> nhớ lưu vào prompt log

## Assistant — Task 4 work record

> Mình sẽ xem lại contract, quy tắc và prompt log, rồi triển khai service dùng
> một shared state. Điểm quyết định race sẽ được đặt rõ: trước mỗi thao tác đồng
> bộ, service xử lý expiry đến hạn; checkout chỉ thắng nếu commit khi
> `now < expiresAt`.

- Service and documentation were added without wiring inventory into the UI.
  The planned checks used controlled clocks, delays, and scheduler behavior.
- After the first verification pass, added focused checks for retries, cancellation,
  checkout, expiry, and refusal to reset or mutate after disposal.
- Final scope review kept the change limited to the Task 4 service, its
  documentation/checklist, and this conversation log.

- Read the existing service contracts, Task 1 contract decisions, project rules,
  and existing prompt log before implementation.
- Added `src/service/mock-sale-service.ts` with per-instance shared state,
  deterministic IDs, reserve/cancel/expiry/checkout operations, idempotency,
  injected clock/delay/failure/scheduler, inventory snapshots, and disposal.
- Added `docs/task4-mock-service.md` defining decision boundaries, exact expiry
  race policy, idempotency behavior, and single-process limitation.
- Updated the Task 4 checklist.
- Initial typecheck found two TypeScript narrowing/inference issues in reserve
  replay and timer cancellation; both were corrected before final validation.
- One early expiry test used a fixed clock, then tried to move time backwards to
  test another scenario. That test setup was invalid; the scenarios were rerun
  with separate injected clocks.
- Final observed verification: `npm run typecheck`, `npm run lint`,
  `npm run build`, and controlled Node assertions passed. Assertions covered 20
  competing reservations (exactly 10 granted), shared/idempotent reserve,
  payload conflict, repeated cancellation, repeated checkout returning one
  order, inventory conservation, exact-deadline expiry winning, checkout just
  before expiry winning, post-sale checkout vs new-reserve rejection, injected
  failure/retry, and disposal during pending delay.
- No production network, randomness, UI integration, or automated test-runner
  configuration was added; automated suite work remains for Task 7.

## Assistant — Task 4 result

> Đã triển khai mock service có shared state cho một sản phẩm, 10 đơn vị tồn và
> reservation 30 giây. Service hỗ trợ reserve/cancel/expire/checkout, idempotency,
> clock/delay/failure injection và dispose.
>
> Quy tắc race: service xử lý expiry trước quyết định thao tác; expiry thắng tại
> `now >= expiresAt`, checkout chỉ thắng nếu commit khi `now < expiresAt`.
>
> Typecheck, lint, build và kiểm tra xác định các invariant đều đạt. Đúng 10/20
> request đồng thời được cấp hold; kiểm tra thêm hủy/expiry không hoàn tồn hai
> lần, checkout lặp không tạo order mới, failure/retry và dispose khi đang chờ.
> Chưa tích hợp UI hoặc thêm automated test runner (để Task 7).
>
> Commit `4fbf9ad` — `feat(service): implement inventory simulation`.

The Task 4 implementation was committed first. This log entry was finalized in
a follow-up documentation-only commit so the log could include the verified
commit ID and final response.
