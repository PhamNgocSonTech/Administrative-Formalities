# Quản trị TTHC — Công Thương Tây Ninh (Nuxt FE)

Giao diện quản trị + cổng tra cứu công dân cho hệ thống Thủ tục hành chính, viết bằng **Nuxt 4 + shadcn-vue**. Gọi API vào backend **FastAPI** chạy riêng (repo `tthc-tra-cuu-main`).

- 10 trang admin: TTHC, Import Word, Quyết định, Chờ duyệt, Version detail, Tài khoản, Lĩnh vực & hỗ trợ, Nhật ký, Login
- 5 trang công dân: Tra cứu, Chi tiết TTHC, Quyết định, Lịch sử QĐ, Liên hệ
- Chi tiết tiến độ + flow test: [`docs/PROGRESS.md`](docs/PROGRESS.md)

---

## 1. Yêu cầu

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | **≥ 20** | Quản lý qua [fnm](https://github.com/Schniz/fnm) khuyến nghị |
| Python | 3.11+ (backend) | Cho FastAPI + Alembic |
| PostgreSQL | 17 | Cluster riêng port 55432 (script tự tạo) |
| Windows PowerShell | 5.1+ hoặc PowerShell 7 | Dùng cho script `start-dev.ps1` |

---

## 2. Setup backend (lần đầu)

Clone backend repo `tthc-tra-cuu-main` vào bất kỳ chỗ nào trên máy — gọi là `<BACKEND_DIR>`. Thao tác đều trong thư mục đó:

```powershell
cd <BACKEND_DIR>

# 1. Venv Python + cài deps
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
# Nếu starlette bị cài version mới gây lỗi add_event_handler:
pip install "starlette<1.0"

# 2. Tạo cluster PostgreSQL riêng port 55432 (tự sinh .env với mật khẩu random)
powershell -ExecutionPolicy Bypass -File scripts/pg_dev.ps1 init

# 3. Chạy migrations + tạo tài khoản quản trị
cd backend
alembic upgrade head
python -m app.cli create-user quantri --roles system_admin,editor,approver --full-name "Tên của bạn"
# Nhập mật khẩu ≥10 ký tự, có chữ và số, không chứa username
```

Xem chi tiết: `<BACKEND_DIR>/docs/HUONG_DAN_CAI_DAT.md`.

> **Nếu dùng `npm run dev:all`**: sửa biến `$Backend` trong [`scripts/start-dev.ps1`](scripts/start-dev.ps1) trỏ đúng `<BACKEND_DIR>` của bạn.

---

## 3. Setup Nuxt (lần đầu)

Ở thư mục gốc dự án Nuxt này:

```bash
fnm use 20     # đảm bảo Node 20
npm install
```

---

## 4. Chạy dev

**Cách nhanh — 1 lệnh** (ở thư mục gốc Nuxt):

```powershell
npm run dev:all
```

Script `scripts/start-dev.ps1` tự:
1. Khởi động PostgreSQL cluster nếu chưa chạy
2. Mở tab Windows Terminal mới chạy `uvicorn` ở `127.0.0.1:8800`
3. Chạy `nuxt dev` tại terminal hiện tại

Mở http://localhost:3000/admin/login → đăng nhập tài khoản đã tạo.

**Cách thủ công (2 terminal riêng):**

```powershell
# Terminal 1 — ở <BACKEND_DIR>
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --app-dir backend --host 127.0.0.1 --port 8800
```

```powershell
# Terminal 2 — ở thư mục gốc Nuxt
fnm use 20
npm run dev
```

---

## 5. Truy cập

| URL | Mô tả |
|---|---|
| http://localhost:3000/ | Trang chủ công dân (tra cứu TTHC) |
| http://localhost:3000/thu-tuc/{mã} | Chi tiết TTHC |
| http://localhost:3000/quyet-dinh | Danh sách Quyết định công bố |
| http://localhost:3000/lien-he | Số hỗ trợ |
| http://localhost:3000/admin/login | Đăng nhập admin |
| http://localhost:3000/admin | Danh sách TTHC (admin) |

Backend API trực tiếp: http://127.0.0.1:8800/openapi.json

---

## 6. Biến môi trường

Nuxt root không cần `.env`. Nếu backend chạy port khác 8800, tạo `.env`:

```
NUXT_PUBLIC_API_BASE=http://127.0.0.1:9999
```

Backend `.env` do `scripts/pg_dev.ps1 init` tạo sẵn. Nếu muốn bật AI bóc tách, thêm vào backend `.env`:

```
TTHC_AI_ENABLED=true
TTHC_OPENAI_API_KEY=sk-...
TTHC_AI_EXTRACT_MODEL=gpt-4o-mini
TTHC_AI_EXTRACT_PRICE_IN_PER_M=0.15
TTHC_AI_EXTRACT_PRICE_OUT_PER_M=0.60
TTHC_AI_EXTRACT_MONTHLY_USD_LIMIT=5
TTHC_AI_MAX_RETRIES=1
```

Restart `uvicorn` sau khi đổi `.env`.

---

## 7. Troubleshooting

| Lỗi | Nguyên nhân & cách sửa |
|---|---|
| `POST /api/auth/login` treo | Backend chưa chạy hoặc port sai. Check http://127.0.0.1:8800/openapi.json trả JSON |
| `500 Internal Server Error` login | Backend không connect được PG. Check cluster `scripts/pg_dev.ps1 status` |
| `add_event_handler` AttributeError | Starlette quá mới. `pip install "starlette<1.0"` trong venv |
| `Node 'with' syntax` khi `nuxt prepare` | Node < 20. `fnm use 20` |
| `pwsh not found` khi `npm run dev:all` | Chưa có PowerShell 7. Script tự fallback `powershell` (5.1) |
| F5 phải login lại | Session cookie 8h đã hết. Login lại |
| Public UI 404 trên `/thu-tuc/{mã}` | Backend chưa có TTHC công khai. Import DOCX + duyệt trước |

---

## 8. Build production

```bash
npm run build
npm run preview    # test local
```

Output nằm trong `.output/`. Deploy bằng:
- Node adapter (mặc định): chạy `node .output/server/index.mjs`
- Docker: chưa viết Dockerfile — xem roadmap trong `docs/PROGRESS.md` mục 10

---

## 9. Cấu trúc thư mục

```
app/
├── assets/main.css           # Tailwind v4 + shadcn OKLCH tokens
├── components/
│   ├── admin/                # TopNav, WordViewer, CutterDialog, AI*, ...
│   ├── public/               # DecisionCard, SupportBlock
│   └── ui/                   # shadcn-vue components
├── composables/              # useAdminAuth, useAdminApi, useConfirm, ...
├── layouts/{admin,public,default}.vue
├── middleware/admin.global.ts
├── lib/utils.ts              # cn() helper
└── pages/
    ├── admin/                # 10 trang quản trị
    ├── thu-tuc/[code].vue    # Chi tiết TTHC công dân
    ├── quyet-dinh/           # QĐ công dân
    ├── lien-he.vue
    └── index.vue             # Trang chủ tra cứu

server/routes/api/[...path].ts  # Proxy / → FastAPI

docs/PROGRESS.md               # Tiến độ chi tiết + checklist test
scripts/start-dev.ps1          # Khởi động full stack 1 lệnh
```

---

## 10. Liên kết

- **Tiến độ dự án**: [`docs/PROGRESS.md`](docs/PROGRESS.md)
- **Backend repo**: `tthc-tra-cuu-main` (riêng)
- **Nguồn nghiệp vụ**: `tthc-tra-cuu-main/docs/` (SRS, phạm vi, quy trình)
