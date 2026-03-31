# onthi-lop6

Ứng dụng ôn tập đầu vào lớp 6 chạy trên Cloudflare Workers + D1, dùng ngân hàng câu hỏi Kết nối tri thức.

## Dữ liệu hiện tại

- Bank đang dùng: `data/kntt-lop6-ontap-bank-v3.jsonl`
- Bank cũ để đối chiếu: `data/kntt-lop6-ontap-bank-v2.jsonl`
- Ma trận và ghi chú cải tiến: `data/kntt-lop6-ontap-bank-v3.md`

## Điểm mới của v3

- Tăng mạnh câu hỏi tình huống, suy luận, so sánh, vận dụng.
- Bổ sung metadata: `source_origin`, `quality_tier`, `source_unit`, `source_lesson`, `skill_tag`.
- Bộ chọn đề trong Worker ưu tiên câu `hard` và `vận dụng` thay vì rút ngẫu nhiên hoàn toàn.

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

## Sinh lại ngân hàng câu hỏi

Nếu chỉnh bank nguồn hoặc script ghép bank:

```powershell
node scripts/generate_bank_v3.js
npm run build
```

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
