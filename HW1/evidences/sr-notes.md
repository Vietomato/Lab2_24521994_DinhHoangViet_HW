## SR modes — Vấn đề điều hướng bằng phím mũi tên

| Chế độ / điều kiện | Thao tác | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| NVDA bật, mode ban đầu chưa xác nhận | Nhấn các phím mũi tên | Người kiểm tra báo không điều hướng được ô | Cần xác minh mode và DOM focus |
| NVDA bật, đã chuyển focus mode | Thử lại phím mũi tên | Người kiểm tra báo vẫn không hoạt động | Chưa đạt |
| Kiểm tra DOM focus bằng Console | Đọc document.activeElement sau 5 giây | Focus ở body; isDataCell=false; row và col là null | Chưa đủ điều kiện kiểm tra điều hướng ô |
| Kiểm tra ô roving tabindex | Tìm td[data-grid-cell][tabindex="0"] | Tìm thấy ô SV0172, data-row="0", data-col="0" | Xác nhận có ô làm điểm Tab |
| Focus bằng code | Gọi cell.focus() qua setTimeout | Chưa xác nhận ô nhận focus và mũi tên hoạt động | Chưa kết luận |
| NVDA tắt, Tab vào ô dữ liệu | Thử ArrowRight và ArrowDown | Chưa có kết quả được xác nhận | NOT RUN / cần kiểm tra |

### Kết quả mong đợi

- Khi ô dữ liệu nhận DOM focus, phím mũi tên chuyển focus
  sang ô tương ứng.
- Khi bật NVDA ở focus mode, vẫn điều hướng được và đọc
  thông tin ô mới.
- Tại biên, focus giữ nguyên; không chuyển vòng.

### Nhận định hiện tại

- Chưa xác định nguyên nhân.
- Có lần đo cho thấy focus nằm ở body thay vì ô dữ liệu.
- Việc tìm thấy tabindex="0" chưa chứng minh ô đã nhận focus.
- Chưa đủ bằng chứng kết luận lỗi thuộc NVDA hay handler của grid.

### Bước kiểm tra tiếp theo

1. Tắt NVDA và đóng DevTools.
2. Focus ô tìm kiếm, Tab qua các nút sort đến ô dữ liệu.
3. Xác nhận vòng focus xuất hiện trên ô.
4. Thử ArrowRight và ArrowDown, ghi kết quả.
5. Bật lại NVDA, chuyển focus mode và lặp lại.
6. Ghi phiên bản NVDA, Chrome và lời đọc thực tế.

### Kết luận

SR04: CHƯA ĐẠT — cần kiểm tra lại khi ô dữ liệu nhận DOM focus.
Task 4.2: CHƯA KẾT LUẬN.