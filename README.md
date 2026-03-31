# onthi-lop6

Ứng dụng ôn tập đầu vào lớp 6 chạy trên Cloudflare Workers + D1, dùng ngân hàng câu hỏi Kết nối tri thức.

## Cấu trúc chính

- `public/`: giao diện 1 trang cho học sinh làm bài.
- `src/index.mjs`: Worker xử lý API và chấm bài.
- `src/question-bank.mjs`: ngân hàng câu hỏi đã được đóng gói cho runtime Worker.
- `migrations/0001_create_attempts.sql`: bảng D1 lưu lịch sử làm bài.
- `data/kntt-lop6-ontap-bank-v2.jsonl`: nguồn dữ liệu câu hỏi gốc.

## Chạy local với Workers + D1

```powershell
cd "D:\Codex project root\test-ums"
npm install
npm run db:migrate:local
npm start
```

Mở trình duyệt tại:

```text
http://localhost:8787
```

## Cập nhật ngân hàng câu hỏi

Mỗi khi chỉnh file `data/kntt-lop6-ontap-bank-v2.jsonl`, hãy chạy lại:

```powershell
npm run build
```

Lệnh này sẽ sinh lại file `src/question-bank.mjs` để Worker dùng trực tiếp.

## Deploy lên Cloudflare

Repo này đã được cấu hình sẵn với D1 database:
- `database_name`: `onthi-lop6-db`
- `database_id`: `6166e811-abe4-49cd-9f24-48450e57e2dc`

Các bước deploy:

1. Đăng nhập Wrangler nếu máy chưa đăng nhập:
   ```powershell
   npx wrangler login
   ```
2. Chạy migration remote:
   ```powershell
   npm run db:migrate:remote
   ```
3. Deploy:
   ```powershell
   npm run deploy
   ```

Nếu deploy bằng Git trên Cloudflare dashboard:
- `Build command`: `npm run build`
- `Deploy command`: `npx wrangler deploy`

## Ghi chú

- Giao diện giữ luồng đơn giản: tạo đề, làm bài, nộp bài, xem điểm và lịch sử gần đây.
- Các file PDF sách giáo khoa gốc vẫn được giữ local và không đẩy lên git.
