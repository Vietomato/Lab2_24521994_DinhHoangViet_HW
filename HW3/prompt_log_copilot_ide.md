# Copilot IDE Prompt Log

Conversation log for Task 2 through Task 7, including user prompts, assistant
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

## User — Task 5

> Làm task 5: tích hợp UI với countdown, reducer và mock service.
>
> Hiển thị sản phẩm, tồn kho, countdown sale,
> nút giữ hàng, thời gian giữ còn lại, checkout và hủy.
> Hiển thị loading, success, expired và lỗi rõ ràng.
> Khóa thao tác không hợp lệ; dùng semantic HTML và focus rõ.
>
> Có optimistic UI update và rollback khi request thất bại.
> Tách số tồn hiển thị tạm khỏi tồn được service xác nhận,
> tránh trừ hoặc hoàn tồn hai lần.
> Cleanup đúng khi unmount và hoạt động với React StrictMode.
>
> Commit: feat(ui): integrate flash sale flow

## Assistant — Task 5 work record

> Mình sẽ xem cấu trúc UI hiện tại, contracts/service và yêu cầu Task 5 trước khi
> nối các phần. Sau đó sẽ triển khai giao diện, quản lý vòng đời request khi
> unmount/StrictMode và kiểm tra đầy đủ các trạng thái tương tác.
>
> UI sẽ dùng service singleton để giữ một kho authoritative trong phiên, còn số
> tồn optimistic là delta riêng và chỉ được reconcile bằng snapshot service. Khi
> component unmount, request reserve trả muộn sẽ được hủy nếu đã tạo hold;
> `pagehide` dọn service timer mà không làm hỏng chu kỳ cleanup/setup của
> StrictMode.

- Read the existing UI entry, contracts, reducer, countdown hook, service, and
  Task 5 checklist before replacing the startup page.
- Replaced the startup page with a responsive flash-sale product UI. Connected
  sale/hold countdowns, lifecycle reducer, and a shared mock service; added
  reserve, checkout, cancel, appropriate retry controls, status/error feedback,
  and semantic keyboard-operable controls with visible focus.
- Kept optimistic available-stock delta separate from the service snapshot.
  Receipts reconcile successful actions; failed requests refresh authoritative
  inventory and clear the temporary delta.
- Kept the shared service outside the component so StrictMode effect
  cleanup/setup does not dispose it. Unmounted UI ignores late results and
  cancels a late successful reservation. Hook timers/listeners clean up on
  unmount; service expiry timers dispose on `pagehide`.
- Browser verification observed: reserve via keyboard changed displayed stock
  from 10 to 9, checkout announced a successful order, cancellation restored
  displayed stock to 10, and the 375px viewport had no horizontal overflow.
- `npm run typecheck`, `npm run lint`, and `npm run build` passed. A lint failure
  initially identified synchronous state updates in the expiry effect; moving
  that work to a cleanup-managed timeout resolved it.

## Assistant — Task 5 result

> Đã tích hợp UI flash sale với countdown, reducer và mock service. Giao diện
> hiển thị sản phẩm, tồn kho, thời gian sale/giữ hàng; hỗ trợ giữ, hủy,
> checkout và retry cùng trạng thái loading/success/expired/error.
>
> Số tồn optimistic được giữ riêng với snapshot authoritative và được reconcile
> sau thành công hoặc rollback sau lỗi. UI dùng semantic controls, focus rõ, xử
> lý response muộn sau unmount và giữ service tương thích React StrictMode.
>
> Typecheck, lint, build đều đạt. Browser kiểm tra reserve bằng bàn phím, tồn
> giảm từ 10 xuống 9, cancel hoàn về 10, checkout thành công và viewport 375px
> không tràn ngang.
>
> Commit `78973a9` — `feat(ui): integrate flash sale flow`.

The prompt log was finalized after the implementation commit in a follow-up
documentation-only commit.

## User — Task 6

> Làm task 6: rà soát và hoàn thiện xử lý concurrency
> trên code hiện tại.
>
> Kiểm tra bấm trùng, response sai thứ tự, hủy khi request
> đang chạy, checkout gần expiry và kết quả sau unmount.
> Không chỉ dựa vào disabled button để bảo đảm tính đúng đắn.
>
> Bổ sung cách chạy 20 yêu cầu giữ hàng đồng thời
> trên cùng service có tồn 10, hiển thị kết quả thật.
> Nếu đã đủ reservation hợp lệ thì tối đa 10 thành công.
> Không âm tồn, không giữ hoặc hoàn tồn lặp.
> Giải thích rõ giới hạn mô phỏng trong một ứng dụng.
>
> Không cố tình tạo lỗi để rồi sửa.
> Commit phù hợp theo thay đổi thực tế, ví dụ:
> fix(concurrency): handle duplicate and stale requests

## Assistant — Task 6 work record

> Mình sẽ rà lại reducer, service và UI sau Task 5, tập trung vào bấm trùng, hủy
> khi reserve đang chờ, checkout sát hạn và cleanup khi unmount. Sau đó mình sẽ
> thêm demo 20 request trên cùng service và hiển thị kết quả kiểm chứng thực tế.
>
> Mình đã thêm trạng thái reducer riêng để hủy một reserve đang chờ: giao diện
> không báo hủy xong sớm; nếu service đã cấp hold thì nó sẽ yêu cầu cancel rồi mới
> trả UI về trạng thái sẵn sàng. Demo 20 request tách trong `<details>`, dùng cùng
> service và khóa các thao tác mua trong lúc đo.
>
> Luồng UI đã kiểm tra trên browser: giữ hàng bằng bàn phím, tồn hiển thị giảm từ
> 10 xuống 9, checkout thành công; cancel trả tồn về 10 và mobile không tràn ngang.
> Mình ghi lại các quan sát này, rồi rà diff và kiểm tra cuối trước commit.

- Inspected the post-Task-5 UI, reducer, service, Task 6 checklist, and project
  rules before changing concurrency behavior.
- Added reducer support for cancelling an in-flight reserve and ensuring a
  granted hold is cancelled before the UI returns to an idle purchase state.
- Added a separately disclosed 20-request demo against the existing shared
  service, with real success/failure counts, starting/final stock, and error codes.
- Documented the single-page-instance limit. The later Task 7 prompt requested
  removal of screenshot requirements/results; evidence is kept as verification
  records under `evidence/`, without requiring images.
- Observed browser demo result: 10/20 reserve requests succeeded, 10/20 failed
  with `SOLD_OUT`, ending at 0 available, 10 reserved, 0 sold in 7 ms. Browser
  double-click created one hold and displayed stock 9, not 8.
- Controlled reducer/service checks passed for pending-reserve cancellation and
  cleanup, checkout immediately before expiry, and stale response handling.
- `npm run typecheck`, `npm run lint`, and `npm run build` passed.

## Assistant — Task 6 result

Task 6 changes are committed separately before Task 7 test work.

## User — Task 7

> Làm task 7: viết tests từ code thực tế tôi cung cấp.
>
> Kiểm tra:
> - Countdown theo deadline, callback trễ và thời gian về 0.
> - Chuyển trạng thái hợp lệ, event/response cũ.
> - 20 yêu cầu reserve với tồn 10.
> - Cancel và expiry hoàn tồn đúng một lần.
> - Checkout lặp không tạo thêm đơn.
> - Checkout cạnh tranh với expiry.
> - Rollback sau lỗi và cleanup.
>
> Dùng fake clock, deferred promises hoặc delay kiểm soát được.
> Không chờ 30 giây thật, không phụ thuộc random.
> Chỉ thêm test runner tối thiểu nếu cần.
> Không âm thầm sửa implementation để tests pass.
>
> Commit: test(hw3): verify sale invariants
>
> Sửa prompt Task 6 để bỏ yêu cầu và kết quả chụp ảnh; lưu kiểm chứng trong
> `HW3/evidence/` (không yêu cầu ảnh).

## Assistant — Task 7 work record

- Added Vitest and jsdom as the test runner/environment, plus a `test` script.
- Added tests against the actual countdown helper/hook, reducer, and mock service.
  The service tests use injected clocks, synchronous atomic commits, controlled
  deferred delays, and a captured scheduler; none wait for the real 30-second
  hold or use randomness/network access.
- Added React/jsdom integration tests with the actual mock service factory and
  injected dependencies. They verify the optimistic stock value while reserve
  is pending, rollback after an injected failure, and cancellation of a granted
  reservation that returns after StrictMode unmount.
- The first test run exposed an incorrect test expectation: idempotent checkout
  correctly returns the same order but retains each attempt's `requestId`.
  Corrected the assertion to compare order identity; no application
  implementation change was made for this assertion.
- Updated the Task 6 prompt record and evidence guidance to remove screenshots;
  Task 6 verification remains recorded in `evidence/`.
- Final validation: `npm test` passed (4 files, 18 tests); `npm run lint` passed;
  `npm run build` passed, including type-checking the source and tests.
- Added `evidence/task7-test-results.md` with the actual results and the
  corrected test-only assertion.

## Assistant — Task 7 result

Task 7 tests and evidence are complete. Changes are ready for the requested
`test(hw3): verify sale invariants` commit.
