# Tiến độ dự án Nuxt — Quản trị TTHC ngành Công Thương Tây Ninh

Cập nhật: **2026-11-10**
Nhánh: `feature/admin-shadcn-fastapi` (22 commits)

Dự án Nuxt này là **giao diện quản trị + cổng tra cứu** cho hệ thống TTHC. Nó **không tự quản lý dữ liệu** — mọi API gọi về backend FastAPI chạy riêng (repo `tthc-tra-cuu-main` của chủ dự án).

**Trạng thái: 100% core features**. 10/10 admin views + 5/5 public views xong.

---

## 1. Kiến trúc tổng thể

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│ Trình duyệt (admin)         │        │ Nuxt 4 dev server            │
│                             │────►   │ localhost:3000               │
│ /admin/*                    │        │                              │
└─────────────────────────────┘        │ app/ (Vue pages + components)│
                                       │ server/routes/api/[...path]  │
                                       │   = proxy thủ công tới FastAPI│
                                       └─────────────┬────────────────┘
                                                     │ /api/**
                                                     ▼
                                       ┌──────────────────────────────┐
                                       │ FastAPI (uvicorn)            │
                                       │ 127.0.0.1:8800               │
                                       │ app/main.py (repo gốc)       │
                                       └─────────────┬────────────────┘
                                                     │
                                                     ▼
                                       ┌──────────────────────────────┐
                                       │ PostgreSQL 17 (cluster riêng)│
                                       │ 127.0.0.1:55432 / tthc_dev   │
                                       │ data: local-data/pg          │
                                       └──────────────────────────────┘
```

**Nuxt chỉ là FE** — không viết lại backend. Lý do (xem chi tiết trong chat):
- Backend đã có FastAPI + SQLAlchemy 2 + Alembic migrations, 27 bảng, audit log, versioning, snapshot/publish, CSRF, cookie session.
- Parser DOCX dùng `lxml` xử lý OOXML (bảng gộp, header/footer, mẫu đơn tách riêng) — rewrite sang Node là 1-2 tháng, dễ sai.
- Giữ FastAPI → tiết kiệm công, đúng SRS đã chốt.

---

## 2. Stack & phụ thuộc chính

| Lớp | Công nghệ | Phiên bản |
|---|---|---|
| Framework | Nuxt | 4.4 |
| View | Vue | 3.5 |
| CSS | Tailwind | 4.3 (OKLCH tokens) |
| Component | shadcn-vue (new-york) + reka-ui | mới nhất lúc migrate |
| Icon | lucide-vue-next | 1.x |
| Toast | vue-sonner | — |
| Diff | `diff` (jsdiff) | 8.x — cho AI viewer |
| Utils | @vueuse/nuxt, class-variance-authority, clsx, tailwind-merge | — |
| Node yêu cầu | ≥ 20 (quản lý qua fnm) | |
| TypeScript | 6.x (devDep) | |

---

## 3. Cách chạy local

### 3.1. Backend FastAPI (bắt buộc)

Backend clone riêng ở `C:\Users\phamn\Downloads\tthc-tra-cuu-main\`.

```bash
# 1. Start PostgreSQL cluster riêng (cổng 55432, không đụng PG chính)
powershell -ExecutionPolicy Bypass -File scripts/pg_dev.ps1 start

# 2. Start uvicorn (giữ terminal này mở)
python -m uvicorn app.main:create_app --factory --app-dir backend --host 127.0.0.1 --port 8800
```

Truy cập backend trực tiếp: <http://127.0.0.1:8800/openapi.json>

### 3.2. Nuxt FE

Ở `D:\Workspace\Nuxt_Project\Administrative-Formalities\`:

```bash
fnm use 20       # đảm bảo Node 20
npm run dev
```

Mở http://localhost:3000/admin/login

- Tài khoản mặc định cho dev: `quantri` / mật khẩu đã đặt lúc `python -m app.cli create-user`
- Reset pass xem lại trong lịch sử chat (SQL hoặc CLI re-create user)

### 3.3. Môi trường

File `.env` hiện tại không bắt buộc (mặc định trỏ `NUXT_PUBLIC_API_BASE=http://127.0.0.1:8800`). Chỉ cần nếu chạy backend ở port khác.

---

## 4. Các view admin — trạng thái

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/admin/login` | ✅ Done | Username+password, nhớ username localStorage, show/hide pass |
| `/admin` (TTHC list) | ✅ Done | Chip tally pub/non/abolished/amending, filter, pagination, bulk delete với lý do |
| `/admin/import` | ✅ Done | Dropzone drag-drop + progress XHR, multi-file + phụ lục tổng hợp, BatchResult, dialog chặn navigate khi còn file |
| `/admin/qd` | ✅ Done | List + form tạo QĐ, search, bulk delete |
| `/admin/d/[id]` | ✅ Done | Metadata, action bar, upload file, gắn QĐ cho nhiều TTHC (3-card nguồn + stepper preview + apply với confirm cảnh báo), bảng liên kết |
| `/admin/v/[id]` | ✅ Done (phase 1+2) | Xem 4 phần dưới |
| `/admin/duyet` | ✅ Done | 2 bảng: versions pending (bulk approve/reject với confirm + báo cáo skipped) + decisions pending (link mở chi tiết) |
| `/admin/users` | ✅ Done | Form tạo + table CRUD vai trò per-row (draft + save), khóa/mở khóa với confirm, đặt lại mật khẩu (dialog + show/hide), validate ≥10 ký tự có chữ + số |
| `/admin/config` | ✅ Done | 2 section: lĩnh vực (name + sort_order) + số hỗ trợ (sector_id, label, phone, note). CRUD với confirm, toggle is_active |
| `/admin/audit` | ✅ Done | Table 300 dòng gần nhất với filter theo actor/action/entity, click row expand JSON detail |

### Public UI (công dân tra cứu)

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/` | ✅ Done | Hero + search + chip lĩnh vực + list kết quả + pager |
| `/thu-tuc/[code]` | ✅ Done | Breadcrumb + hero facts + TOC sticky + 11 section field + biểu mẫu + QĐ + hỗ trợ, in giấy được |
| `/quyet-dinh` | ✅ Done | Search + danh sách QĐ công khai (DecisionCard) |
| `/quyet-dinh/[id]` | ✅ Done | Chi tiết QĐ + list TTHC đang/từng công khai |
| `/lien-he` | ✅ Done | Số chung + theo lĩnh vực với click-to-call tel: |

Public layout dùng shadcn tokens, sticky header + footer legal disclaimer. Cấu trúc URL giữ nguyên code gốc để backend trả link đúng.

### Chi tiết `/admin/v/[id]` (version detail)

Phase 1 (core nghiệp vụ):
- Header + alert blockers + mode "chỉnh sửa tại chỗ" (approver sửa trực tiếp bản công khai, lý do lưu localStorage)
- Actions: gửi duyệt / duyệt / trả lại / ngừng công khai / tạo nháp mới / thay Word / xoá
- 2 cột: 11 nhóm trường (expand/collapse, badge nguồn, dot màu đồng bộ với Word gốc) + WordViewer render `/source-preview`
- Click field ↔ highlight block (dùng CSS variables inline để immune với scoped CSS)
- Textarea edit với lý do, lưu không nhảy đầu trang (snapshot scroll)
- Biểu mẫu: rename, đổi nhóm, tải, xem Word
- Cảnh báo + ghi nhận đã xử lý, liên kết QĐ + gỡ

Phase 2 (tính năng nâng cao):
- **CutterDialog**: chọn block range cho field boundary / form boundary / form add (click + shift-click + nhập số)
- **FormPreviewDialog**: modal render HTML biểu mẫu
- **DossierTree** + **DossierSection**: render layout dropdown của field
- **AiPanel**: chạy AI bóc tách với phạm vi (field / nhóm / toàn bộ), hiện status + lần chạy gần nhất
- **AiViewerDialog**: trình đối chiếu side-by-side dùng `jsdiff.diffWordsWithSpace`, sidebar list items, accept/reject từng mục + bulk với confirm cảnh báo ghi đè thủ công / thiếu căn cứ, edit đề xuất trước khi accept

Phase 3 (polish + UX đợt 2):
- **WordViewer polish**: mini-map vệt màu field + viewport indicator, Ctrl+F search có badge n/M + prev/next, zoom 70-200% (lưu localStorage), block number badge hover
- **"Xem bản dựng đẹp"**: DocxPreviewDialog lazy-load `docx-preview`, fetch DOCX với cookie, override writing-mode cho text luôn ngang
- **Field filter / search cột trái**: lọc chưa có nguồn / biên tập thủ công / có cảnh báo, search theo tên, Mở/Thu tất cả, hiện X/N khi lọc
- **Progress bar completeness**: X/11 trường có nguồn + % ở header
- **Toggle "Tô màu vùng đã bóc tách"** ở WordViewer header (lưu localStorage)
- **Sticky action bar** khi scroll xuống xa (Gửi duyệt / Duyệt / Trả lại + nút "Lên đầu")
- **Dirty state warning**: khi đang edit textarea chưa save, chặn navigate với shadcn Dialog (ở lại / bỏ qua), + beforeunload cho F5/close tab
- **Thanh cuộn mảnh + màu đồng bộ theme** (global, Firefox + webkit)
- **Badge cảnh báo trên field header** nếu có warning ánh xạ theo code

Phase 4 (UX chốt chặn):
- **Cutter drag handles**: 2 thanh kéo-thả BẮT ĐẦU/KẾT THÚC (xanh/đỏ) bám cạnh block đầu/cuối, pointer events + auto-scroll khi kéo gần mép + keyboard ↑↓ khi focus, vẫn giữ click/shift+click và numeric input (giống code gốc)
- **FormPreviewDialog**: port nguyên CSS `.pv-wrap`/`.pv-page`/`.pv-p` từ styles.css gốc — font Times New Roman, trang A4 trắng 794px, nền xám bao ngoài, giống y hệt Word gốc preview
- **ConfirmHost** dùng reka-ui primitives trực tiếp với overlay `bg-black/30` nhạt — fix bug AI viewer accept đen màn (2 dialog chồng + 2 lớp bg-black/80 = ~96% đen)
- **LayoutEditorDialog**: dựng danh sách thả xuống + tô vàng, tải `block-lines?start=X&end=Y`, mỗi dòng 4 nút pill (Mục chủ/Mục con/Nội dung mục/Tô vàng), Shift+Click áp cả đoạn, lưu qua PUT `/layout/{key}`

---

## 5. Component & composable tái sử dụng

### Composable (`app/composables/`)
- `useAdminAuth` — login/logout/verify + state `me` (roles, csrf_token), hasRole helper
- `useAdminApi` — $fetch wrapper (CSRF, credentials:include, SSR cookie forward qua useRequestFetch)
- `useToast` — wrapper vue-sonner (ok/err/info/warning)
- `useConfirm` — composable + ConfirmHost component thay cho `window.confirm`
- `useStatus` — map trạng thái → label VI + class màu

### Admin component (`app/components/admin/`)
- `TopNav` — grid 2-col, tabs role-gated, user dropdown với avatar + badges vai trò
- `StatusBadge` — map status → Badge với variant/màu
- `ConfirmHost` — Dialog toàn cục cho useConfirm
- `StubPage` — placeholder các tab chưa migrate
- `FileDropzone` — drag-drop + click chọn, validate, remove per item
- `BatchResult` — 4 stat card + bảng items của lô import
- `WordViewer` — HTML blocks render + auto-paint màu + highlight
- `CutterDialog` — chọn block range, dùng cho 3 use case
- `FormPreviewDialog` — modal xem trước HTML biểu mẫu
- `DossierTree` + `DossierSection` — recursive tree
- `AiPanel`, `AiViewerDialog`, `AiDiff` — AI bóc tách

### UI shadcn (`app/components/ui/`)
17 component: button, input, label, card, badge, table, tabs, dialog, select, dropdown-menu, sonner, skeleton, checkbox, separator, textarea, progress, alert

---

## 6. Quyết định kỹ thuật đáng nhớ

| Vấn đề | Giải pháp | Lý do |
|---|---|---|
| Node `with` syntax lỗi (shadcn CLI) | Fetch registry JSON qua curl, tự ghi file | shadcn CLI kéo deps yêu cầu Node 22+ |
| Nitro `routeRules.proxy` treo POST | Viết `server/routes/api/[...path].ts` thủ công dùng native fetch | Bug biết trước của httpxy với stream body |
| F5 phải login lại | `useRequestFetch` trong `useAdminAuth.verify` | `$fetch` SSR không tự forward cookie client |
| Button extends PrimitiveProps fail | Inline `as` + `asChild` thay vì extends | Vue compiler không resolve cross-package types |
| `sessionStorage is not defined` SSR | Dùng `useSessionStorage` của VueUse | SSR-safe, auto sync |
| Native `confirm()` xấu | `useConfirm` + `ConfirmHost` + shadcn Dialog | 7 chỗ dùng xong một composable |
| CSS màu field không khớp dot | Set `background` + `box-shadow` inline qua `cssText` | Vue scoped + Tailwind layer không guarantee specificity với CSS var |
| Logout không navigate | `window.location.href` thay `navigateTo` | Clear cached useAsyncData + state |

---

## 7. Roadmap kế tiếp

### Ưu tiên cao (hoàn thiện flow + đóng vòng end-to-end)
1. **`/admin/duyet`** — bulk approve/reject TTHC pending + list QĐ pending (approver flow)
2. **`/admin/users`** — CRUD + role matrix + reset password (system_admin)
3. **`/admin/config`** — danh mục lĩnh vực + số hotline (cho chatbot chặng sau)
4. **`/admin/audit`** — nhật ký read-only với filter

### Ưu tiên thấp (polish)
5. **WordViewer mini-map**: cột bên phải scrollbar với vệt màu theo field, click nhảy
6. **Ctrl+F search** trong WordViewer, highlight vàng
7. **Zoom 90/100/110/125%** trong WordViewer
8. **"Xem bản dựng đẹp"** modal với `docx-preview` (fidelity Word)
9. **Layout editor** (dựng danh sách thả xuống + highlight line cho field)
10. **openapi-typescript** auto-gen type từ FastAPI `/openapi.json`

### Trước khi deploy production
- Dockerfile + `docker-compose.yml` (Nuxt + FastAPI + Postgres + Caddy + R2 cho DOCX)
- `.env.production` template
- Backup pg_dump nightly → R2
- Cloudflare DNS + Let's Encrypt
- Xem đề xuất hạ tầng đã bàn trong chat (Hetzner CX22 + Cloudflare)

---

## 8. Tổng quan commit (22 commits trên `feature/admin-shadcn-fastapi`)

```
a410577 fix(ui): sửa import path registry/new-york/ui → components/ui trong calendar
ae73fe1 feat(public): 5 trang công dân + DatePicker shadcn thay native
8601913 fix(admin): SelectItem không chấp nhận value='' — dùng sentinel cho 'Số chung'
b1d229c feat(admin): hoàn thiện Users + Config + Audit — bám logic code gốc
f5941e6 fix(admin): dialog cutter/layout/form-preview phải bấm 2 lần mới load
a4fa90c feat(admin): Cutter drag handles + Layout editor + fix AI dialog + Form preview CSS gốc
... (14 commits trước)
```

Chưa push lên remote. Push:
```bash
git push -u origin feature/admin-shadcn-fastapi
```

---

## 9. ✅ Full flow test checklist end-to-end

**Mở `npm run dev:all` + DevTools F12 (Console + Network).**

### PHẦN 1 — Chuẩn bị môi trường (admin)
- [ ] 1.1 `/admin/login` login `quantri` → chuyển `/admin`, nhớ username lần sau
- [ ] 1.2 `/admin/users`: tạo `editor1`/`pass123editor` (role Biên tập), `approver1`/`pass123approver` (role Phê duyệt). Khoá/mở khoá 1 user → dialog shadcn
- [ ] 1.3 `/admin/config`: thêm lĩnh vực `Hoá chất`, `Xăng dầu` + hotline chung + hotline theo lĩnh vực

### PHẦN 2 — Nạp dữ liệu TTHC
- [ ] 2.1 `/admin/import`: kéo-thả DOCX → progress bar → batch result với stats
- [ ] 2.2 Verify DB (pgAdmin): `SELECT * FROM procedures ORDER BY id DESC LIMIT 5;`

### PHẦN 3 — Rà soát + sửa TTHC
- [ ] 3.1 `/admin`: thấy TTHC mới ở chip "Không công khai → Nháp"
- [ ] 3.2 Version detail — các tính năng:
  - Progress bar completeness
  - Filter field (chưa có nguồn / có cảnh báo)
  - WordViewer: vùng tô màu, click field → outline đồng màu
  - Zoom 90-125% + Ctrl+F tìm text + Mini-map
  - Toggle "Tô màu" on/off
- [ ] 3.3 Sửa 1 field: không nhảy đầu trang, dirty state cảnh báo khi điều hướng
- [ ] 3.4 Cutter: drag pill xanh/đỏ, click/shift+click, nhập số, autoscroll gần mép
- [ ] 3.5 Biểu mẫu: Xem trước (font Times A4), Ranh giới (Cutter), Tách thêm
- [ ] 3.6 Layout editor (dựng danh sách): Mục chủ/con/nội dung, Shift+Click áp đoạn, tô vàng
- [ ] 3.7 AI (nếu có key): Chạy → Trình đối chiếu diff → Chấp nhận (confirm KHÔNG đen màn)
- [ ] 3.8 Gửi duyệt → status "Chờ duyệt"

### PHẦN 4 — Quyết định công bố
- [ ] 4.1 `/admin/qd`: tạo QĐ với DatePicker shadcn (chọn ngày ký, hiệu lực)
- [ ] 4.2 `/admin/d/{id}` → "Gắn QĐ cho nhiều TTHC": nhập mã → Xem trước đối chiếu → chọn Ban hành mới → confirm → apply
- [ ] 4.3 Upload file PDF/DOCX
- [ ] 4.4 Gửi duyệt QĐ

### PHẦN 5 — Phê duyệt công khai
- [ ] 5.1 `/admin/duyet`: thấy TTHC + QĐ trong 2 bảng. Tick → BulkBar trượt mượt (grid-rows animation) → Duyệt công khai → toast X/N ok
- [ ] 5.2 Mở QĐ riêng → Duyệt (vì có cảnh báo auto_withdrawn)
- [ ] 5.3 Verify `/admin`: chip "Công khai" +1, version status "Đang công khai"

### PHẦN 6 — Nhật ký
- [ ] 6.1 `/admin/audit`: thấy entries `auth.login`, `import.docx`, `version.submit`, `version.approve`, `decision.create`
- [ ] 6.2 Filter "approve" → thu hẹp
- [ ] 6.3 Click row → expand JSON detail

### PHẦN 7 — Public UI (tab incognito)
- [ ] 7.1 `/` — hero + search + chip lĩnh vực đúng count
- [ ] 7.2 `/thu-tuc/{code}` — breadcrumb + 6 fact tile + TOC sticky scroll smooth + tải biểu mẫu + In hướng dẫn (print preview)
- [ ] 7.3 `/quyet-dinh` — list QĐ, click → chi tiết + list TTHC
- [ ] 7.4 `/lien-he` — số chung + theo lĩnh vực, click số → `tel:`

### Edge cases
- [ ] F5 giữa khi edit field → dialog cảnh báo "Thay đổi chưa lưu"
- [ ] Logout → `/admin/login`, state clear sạch
- [ ] Reload sau 8h (session Max-Age=28800) → auto redirect login
- [ ] Tab active underline + nền primary/8 đổi khi click nav
- [ ] Toast "đang phát triển" không còn hiện (3 view đã migrate)

---

## 10. Vẫn chưa làm (optional, có thể để sau)

| Mảng | Token ước | Khi cần |
|---|---|---|
| Chatbot UI (public) | ~15k | Khi backend bật chatbot + có Qdrant |
| Deploy docker-compose (Caddy + PG + FastAPI + Nuxt) | ~15k | Khi thuê VPS production |
| `openapi-typescript` auto-gen types | ~5k | Sync BE-FE type, nice-to-have |
| Backup pg_dump → R2 nightly | ~3k | Prod |

---

## Lịch sử phiên bản

- **2026-11-10**: thêm Public UI (5 trang) + DatePicker shadcn + 3 view admin cuối (Users/Config/Audit) + fix SelectItem empty value + sửa import path calendar. **Đạt 100% core features.**
- **2026-11-08 muộn**: Cutter drag handles + Layout editor + fix AI dialog stacking + Form preview CSS gốc + BulkBar transition mượt
- **2026-11-08 sớm**: 7 commit đầu (foundation shadcn + proxy + 6 view admin + Phase 2 Version detail + polish WordViewer + Docx preview)

Chưa push lên remote. Push khi sẵn sàng:

```bash
git push -u origin feature/admin-shadcn-fastapi
```

---

## 9. File cần loại trừ khi commit (đã trong `.gitignore`)

- `tthc-tra-cuu-main/` — bản clone repo tham khảo backend, không phải code Nuxt
- `.env`, `.env.*` (trừ `.env.example`)
- `administrative-formalities-*.json` (Google service account key cũ)
- `node_modules/`, `.nuxt/`, `.output/`, `.nitro/`, `.cache/`
- `.venv/` (nếu lỡ tạo trong root Nuxt)

---

## 10. Liên hệ & tài liệu nguồn

- **SRS v1.2 gốc + YEUCau_DA_CHOT.md**: nguồn kiểm soát nghiệp vụ (xem repo backend `tthc-tra-cuu-main/docs/` khi cần)
- **Hướng dẫn cài backend**: `tthc-tra-cuu-main/docs/HUONG_DAN_CAI_DAT.md`
- **Phạm vi nghiệp vụ**: `tthc-tra-cuu-main/docs/PHAM_VI_VA_CHUC_NANG.md`
- **Quy trình**: `tthc-tra-cuu-main/docs/QUY_TRINH_NGHIEP_VU.md`
