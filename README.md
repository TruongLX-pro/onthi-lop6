# onthi-lop6

Ứng dụng local đơn giản để học sinh ôn tập đầu vào lớp 6 bằng ngân hàng câu hỏi Kết nối tri thức.

## Chạy local

```powershell
cd "D:\Codex project root\test-ums"
npm install
npm start
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

## Tính năng

- Tạo đề ôn theo môn hoặc tất cả môn
- Chọn số câu cho mỗi lượt làm
- Chấm điểm ngay sau khi nộp
- Hiển thị số câu đúng, số câu sai, tỉ lệ đúng và điểm thang 10
- Lưu lịch sử từng lần làm bài trên máy local

## Dữ liệu chính

- `data/kntt-lop6-ontap-bank-v2.jsonl`

## Ghi chú

- File PDF sách giáo khoa gốc và ảnh trung gian không được đưa lên git.
- File `data/attempt-results.jsonl` là dữ liệu local của từng máy nên cũng không được track.
