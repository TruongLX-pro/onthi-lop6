# Test Question Dataset

Dataset này được thiết kế để có thể bổ sung thêm đề mới về sau.

## Cấu trúc chính

- `dataset_id`: mã bộ dữ liệu.
- `title`: tên đề.
- `source_images`: danh sách ảnh nguồn.
- `questions`: mảng câu hỏi.

## Trường của mỗi câu hỏi

- `id`: mã câu hỏi duy nhất trong dataset.
- `number`: số câu trong đề.
- `section`: phần của đề.
- `subject`: môn/chủ đề.
- `type`: kiểu câu hỏi.
- `prompt`: nội dung yêu cầu chính.
- `passage`: đoạn văn/đoạn thơ/dữ liệu phụ trợ nếu có.
- `options`: lựa chọn trả lời, hoặc `option_pool` với câu ghép cặp.
- `screen_selected_answer`: đáp án đã được chọn trên ảnh chụp màn hình, nếu có.
- `correct_answer`: đáp án đúng đã kiểm tra lại.
- `accepted_answers`: dùng cho câu điền số/tự điền ngắn.
- `explanation`: ghi chú ngắn về cách xác minh đáp án.
- `source_images`: ảnh liên quan đến câu hỏi.
- `verification_status`:
  - `direct_from_image`: đáp án đúng thể hiện rõ trên ảnh và phù hợp nội dung.
  - `verified_by_reasoning`: đáp án được kiểm tra lại bằng lập luận/ngữ pháp/toán học/đọc hiểu.
  - `inferred_from_image_text`: văn bản có phần bị cắt, đã khôi phục theo ngữ cảnh ảnh.

## Ghi chú

- Nhiều đáp án được tô chọn trong ảnh là lựa chọn của học sinh làm bài, không phải đáp án đúng.
- Khi có khác biệt, `correct_answer` là đáp án chuẩn để dùng cho ngân hàng câu hỏi.
