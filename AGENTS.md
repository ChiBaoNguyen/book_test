# HƯỚNG DẪN VÀ QUY ĐỊNH BẮT BUỘC DÀNH CHO AI AGENT (MANDATORY AGENT GUIDELINES & WORKFLOW)

> **CẢNH BÁO PHÁP LỆNH TỐI CAO (STRICT DIRECTIVE):**
> Tất cả các AI Agent, Sub-Agent hoặc Developer khi làm việc trên dự án này **BẮT BUỘC** phải tuân thủ nghiêm ngặt toàn bộ các quy định và quy trình dưới đây.
> Khi có bất kỳ yêu cầu mới hoặc yêu cầu chỉnh sửa nào:
> 1. **BẮT BUỘC** phải kiểm tra mã nguồn (`Controllers`, `Views`, `wwwroot`), hiểu rõ quy ước đang chạy trước khi sửa.
> 2. **BẮT BUỘC** sửa code theo đúng quy định đặc thù của source code hiện tại (Bookle Theme, ASP.NET Core MVC + BFF API Proxy).
> 3. **BẮT BUỘC** phải kiểm thử kỹ càng theo đúng **Flow nghiệp vụ (Workflow)** được quy định tại Mục II trước khi tuyên bố hoàn thành task.

---

# MỤC I: QUY CHUẨN ĐẶC THÙ CỦA SOURCE CODE HIỆN TẠI

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG
- **Framework & Nền tảng:** ASP.NET Core 8.0 MVC kết hợp Web API Controller đóng vai trò BFF (Backend-For-Frontend) / API Proxy.
- **Theme & Giao diện:** Template **Bookle** (E-book / Book Store theme), sử dụng Bootstrap 5, FontAwesome, Icomoon, Swiper, Magnific Popup, và thư viện **3D FlipBook** chuyên biệt cho E-book.
- **Mô hình xử lý dữ liệu:**
  1. **Server-Side Rendering (SSR):** Razor Views đảm nhiệm khung giao diện, layout, SEO tags (Meta, Title), OpenGraph, và dữ liệu khởi tạo thông qua `ViewBag` / `ViewData` / `Model`.
  2. **Client-Side Rendering (CSR):** Dynamic fetching từ client qua Vanilla JavaScript tới các endpoint `/api/Portal/...` để tải danh mục, sách, bài viết, sự kiện, chuyển đổi ngôn ngữ không reload trang.
  3. **Data Communication:** Web App giao tiếp với Core Backend thông qua [ApiService](file:///e:/work/Lads/Ebook-20260914/Services/ApiService.cs) (sử dụng HttpClient với JWT Token được sinh từ `WebsiteKey`).

---

## 2. QUY ĐỊNH VỚI CONTROLLERS (`Controllers/`)

### 2.1. Phân loại Controllers - Tuyệt đối không lẫn lộn:
1. **MVC Page Controllers** (ví dụ: `HomeController`, `BookController`, `ArticleController`, `PageController`, `SinglePageController`, `EventsController`):
   - Kế thừa từ `Microsoft.AspNetCore.Mvc.Controller`.
   - Trả về `IActionResult` với `View()`.
   - **Nhiệm vụ:** Nhận request từ routing URL (đã map trong `Program.cs`), gọi `_apiService.GetAsync<T>()` lấy dữ liệu theo slug, gán vào `ViewBag` hoặc ViewModel, và trả về View tương ứng.
   - **Xử lý đa ngôn ngữ:** Phải luôn kiểm tra fallback ngôn ngữ theo thứ tự: Query string `?lang=...` -> Cookie `selectedLanguage` -> mặc định `"vi"`.
   - **Slug Safety:** Mọi tham số slug truyền vào URL phải được kiểm tra `string.IsNullOrWhiteSpace(slug)` và mã hóa bằng `Uri.EscapeDataString(slug)`.
2. **API Proxy Controllers** (ví dụ: `PortalController`, `ApiController`):
   - Kế thừa từ `Microsoft.AspNetCore.Mvc.ControllerBase`.
   - Đánh dấu `[ApiController]` và `[Route("api/Portal")]` hoặc `[Route("api/[controller]")]`.
   - **Nhiệm vụ:** Đóng vai trò BFF Proxy trung gian giữa Browser và Core Backend. Bảo vệ token bí mật, giải quyết vấn đề CORS, proxy tải file/hình ảnh (`/api/Portal/proxy/file?url=...`).
   - Phải có `try...catch` đầy đủ, trả về `StatusCode(500, new { message = ..., error = ex.Message })` khi có lỗi.
   - Phân trang chuẩn: `pageNumber` (mặc định 1), `pageSize` (mặc định 8, 12 hoặc 20 tùy component), dùng `Math.Clamp(pageSize, 1, 50)`.

### 2.2. Quy ước DTO và Models:
- DTO dành riêng cho Controller có thể đặt ngay trong file Controller hoặc trong thư mục `Models/`.
- Phải dùng cú pháp C# nullable (`string?`, `int?`, `List<T>?`).
- Tên thuộc tính trong DTO mapping PascalCase và hỗ trợ case-insensitive khi deserialization từ Core API.
- Các DTO có đa ngôn ngữ luôn có danh sách `Translations` (chứa `LanguageCode`, `Title`, `Content`, `Summary`, `UrlSlug`, ...).

---

## 3. QUY ĐỊNH VỚI VIEWS (`Views/`)

### 3.1. Phân cấp và Tổ chức thư mục
- `Views/Shared/_Layout.cshtml`: Layout gốc nhúng CSS/JS Bookle, Meta SEO, Header menu (`_Menu.cshtml`), Main `@RenderBody()`, và Footer (`_Footer.cshtml`).
- `Views/Shared/Home/`: Chứa các Component Partial của trang chủ (`_HomeBooks.cshtml`, `_HomeFeaturedBooks.cshtml`, `_HomeCateloryBooks.cshtml`).
- `Views/{Feature}/Index.cshtml`: Trang chi tiết hoặc danh sách theo tính năng (`Views/Book/Index.cshtml`, `Views/Article/Index.cshtml`, `Views/Page/Index.cshtml`, v.v.).

### 3.2. Quy tắc viết Razor View
1. **Sử dụng Partial Views:** Gọi bằng cú pháp: `@await Html.PartialAsync("~/Views/Shared/Home/_HomeBooks.cshtml")` hoặc `@await Html.PartialAsync("_PartialName")`.
2. **Serialization An Toàn:** Truyền dữ liệu sang Client-side JavaScript bằng:
   ```razor
   const bookData = @Html.Raw(Json.Serialize(new { ... }));
   ```
   Tuyệt đối không dùng `eval()` hoặc nhúng chuỗi string thô không qua serialization để tránh lỗi bảo mật XSS.
3. **Client-side Rendering & Dynamic Loading:**
   - Client JS phải viết theo module tự gọi (IIFE: `(() => { ... })();`) hoặc gán vào sự kiện `document.addEventListener('DOMContentLoaded', ...)` để tránh ô nhiễm biến toàn cục.
   - Luôn có hàm `escapeHtml(str)` khi gán HTML động bằng template literals (`${...}`).
   - Các trạng thái Loading / Empty / Error phải được hiển thị đầy đủ, không để giao diện bị giật (FOUC).
4. **Hỗ trợ Đa ngôn ngữ (i18n):**
   - Đọc ngôn ngữ từ `localStorage.getItem('selectedLanguage') || 'vi'`.
   - Lắng nghe sự kiện `window.addEventListener('languageChanged', (event) => { ... })` để cập nhật lại nhãn giao diện và gọi lại API nạp dữ liệu theo ngôn ngữ mới mà không cần reload trang.
   - Các từ khóa UI tĩnh lấy từ `/locales/page.json`.
5. **Class CSS & Tag chuẩn Bookle:**
   - Giữ nguyên các class semantic của template Bookle: `.shop-section`, `.shop-box-items`, `.book-thumb`, `.shop-content`, `.theme-btn`, `.wid-title`.
   - Tùy chỉnh CSS phải viết trong thẻ `<style>` ở đầu file Partial View với scoping rõ ràng (ví dụ: `.home-books-wrapper .nav-item ...`).

---

## 4. QUY ĐỊNH VỚI STATIC ASSETS (`wwwroot/`)

### 4.1. Cấu trúc thư mục
- `wwwroot/assets/`:
  - Thư mục gốc chứa Vendor Template Bookle (`assets/css/`, `assets/js/`, `assets/img/`, `assets/webfonts/`).
  - **TUYỆT ĐỐI KHÔNG** sửa đổi trực tiếp các file vendor minified (`bootstrap.min.css`, `all.min.css`, `swiper-bundle.min.css`, `main.js`).
- `wwwroot/book/`:
  - Chứa thư viện **3D FlipBook** (`book/css/`, `book/js/`, `book/templates/default-book-view.html`, `book/media/`).
  - Base path của FlipBook luôn là `/book/`. Mọi file PDF từ CDN bên ngoài phải đi qua endpoint proxy `/api/Portal/proxy/file?url=...` để tránh lỗi CORS.
- `wwwroot/css/`: Chứa `bookle/` (các file CSS bổ trợ của Bookle).
- `wwwroot/js/`: Chứa các file JavaScript xử lý nghiệp vụ theo từng trang (`site.js`, `heritage.js`, `contact.js`, `gallery.js`, `events-page.js`).
- `wwwroot/locales/page.json`: Lưu trữ từ điển đa ngôn ngữ ở client-side. Thêm nhãn UI mới phải bổ sung key vào file này.

### 4.2. Quy tắc nhúng Resource
- Mọi đường dẫn asset trong Razor View **PHẢI** bắt đầu bằng dấu ngã `~/` (ví dụ: `<link rel="stylesheet" href="~/css/bookle/main.css">`).
- Bắt buộc thêm thuộc tính `asp-append-version="true"` cho CSS/JS nội bộ:
  ```html
  <script src="~/js/site.js" asp-append-version="true"></script>
  ```
- Không bao giờ hardcode domain hoặc đường dẫn máy chủ cục bộ (`localhost:5001` hay `C:\...`) vào client-side script.

---

# MỤC II: FLOW NGHIỆP VỤ & NGUYÊN TẮC THỰC THI (AGENT WORKFLOW)

## 1. NGUYÊN TẮC PHÁT TRIỂN (CORE PRINCIPLES)

### 1.1. Existing Code Is The Source Of Truth
Mã nguồn hiện tại là chân lý tối cao. Trước khi sửa:
- Kiểm tra cách code hiện tại đang chạy.
- Tái sử dụng các component, helper, style có sẵn.
- **Ưu tiên:** SỬA ĐỔI CODE HIỆN CÓ thay vì VIẾT LẠI TỪ ĐẦU.

### 1.2. UI-First Development & Bảo vệ Kiến trúc
Trừ khi có yêu cầu thay đổi chức năng/nghiệp vụ rõ ràng từ người dùng:
- **CHỈ thay đổi UI:** Razor markup, HTML, CSS/SCSS, Layout, Spacing, Typography, Colors, Icons, Responsive, Animations, Visual/Loading/Empty/Error states.
- **TUYỆT ĐỐI KHÔNG tự ý thay đổi:** API contracts, Backend APIs, Controllers routing, Services, Repositories, Authentication, Middleware, Database logic, Package versions, Cấu trúc thư mục.

### 1.3. Do Not Break Existing Functionality
Không làm gãy bất kỳ tính năng hiện có nào: Button actions, Form submit, API calls, Navigation, Search, Filter, Phân trang, Modals, Tabs, Đa ngôn ngữ, Flipbook reader.

### 1.4. Minimal Change Principle
Thực hiện thay đổi nhỏ nhất có thể để đạt được kết quả yêu cầu.
- Không rename file/biến không liên quan.
- Không reformat toàn bộ file không liên quan.
- Không tự ý nâng cấp package hoặc thay thế thư viện đang chạy ổn định.

### 1.5. Quyền Hạn Thao Tác File (File Modification & Deletion Policy)
- **ĐƯỢC PHÉP:** Update, chỉnh sửa nội dung, thêm mới mã nguồn trong các file (`Controllers`, `Views`, `Models`, `wwwroot`, v.v.) để đáp ứng yêu cầu công việc.
- **TUYỆT ĐỐI CẤM XÓA FILE:** Không được phép xóa bất kỳ file nào hiện có trong dự án (nghiêm cấm chạy các lệnh xóa file như `rm`, `del`, `Remove-Item`, `git rm`, v.v.). Mọi tài nguyên, code cũ, file backup hoặc cấu trúc thư mục hiện có phải được bảo toàn nguyên vẹn.

---

## 2. QUY TRÌNH THỰC HIỆN 6 BƯỚC BẮT BUỘC (REQUIRED WORKFLOW)

Mọi task từ người dùng phải được AI Agent thực hiện tự động và đầy đủ theo chu trình khép kín:

```
[ BƯỚC 1: ANALYZE (Kiểm tra source) ]
                 ↓
[ BƯỚC 2: PLAN (Lập kế hoạch fix theo chuẩn) ]
                 ↓
[ BƯỚC 3: IMPLEMENT (Chỉnh sửa tối thiểu) ]
                 ↓
[ BƯỚC 4: STATIC VALIDATION (dotnet build / lint) ]
                 ↓
[ BƯỚC 5: BROWSER & RUNTIME VERIFY (Kiểm thử thực tế) ]
                 ↓
[ BƯỚC 6: ACCEPTANCE CHECK ]
          ↙               ↘
     ĐẠT (PASS)       LỖI (FAIL)
         ↓                 ↓
      HOÀN TẤT      [ VÒNG LẶP FIX LOOP ]
                    (Tối đa 5 lần lặp lại)
```

---

### BƯỚC 1 — ANALYZE (Kiểm tra và thấu hiểu source)
Trước khi chỉnh sửa bất kỳ dòng code nào:
1. Đọc file liên quan và các component cha/con liên đới.
2. Kiểm tra styles, CSS classes hiện có của Bookle.
3. Kiểm tra các hàm JS, endpoint API (`/api/Portal/...`) đang được gọi.
4. Xác định rõ ràng những gì PHẢI GIỮ NGUYÊN.

---

### BƯỚC 2 — PLAN (Kế hoạch chỉnh sửa chuẩn mực)
Xác định cụ thể:
- Danh sách file cần sửa.
- Component/Class cần tái sử dụng.
- Đảm bảo tuân thủ đúng quy định ở Mục I (Controller/View/wwwroot).
- Giữ phạm vi thay đổi ở mức tối thiểu.

---

### BƯỚC 3 — IMPLEMENT (Thực thi)
Tiến hành chỉnh sửa code:
- Giữ đúng style code và quy ước đặt tên của file hiện tại.
- Xử lý đa ngôn ngữ: Cập nhật `locales/page.json` nếu có text mới, dùng `t('key')` hoặc `translations`.
- Chống XSS với `escapeHtml()`.
- Giữ đúng class semantic Bookle.

---

### BƯỚC 4 — STATIC VALIDATION (Kiểm tra biên dịch & mã nguồn)
Sau khi chỉnh sửa:
- Chạy lệnh build của dự án:
  ```powershell
  dotnet build
  ```
- **Yêu cầu:** Phải đạt `Build succeeded. 0 Error(s)`.
- Nếu có lỗi biên dịch hoặc Razor syntax error, bắt buộc sửa ngay trước khi chuyển bước tiếp theo.

---

### BƯỚC 5 — BROWSER & RUNTIME VERIFICATION (Kiểm thử trình duyệt)
Khi có môi trường chạy hoặc kiểm thử giao diện:
- **Cấu hình khởi chạy và kiểm thử bắt buộc:** Khi chạy test môi trường runtime, **BẮT BUỘC** phải chạy trên giao thức HTTPS tại cổng 5000:
  ```powershell
  dotnet run --launch-profile https
  ```
  (Địa chỉ ứng dụng bắt buộc: **`https://localhost:5000`**).
1. **Kiểm tra Layout & Visual:**
   - Cấu trúc trang, spacing, padding, margin, font chữ, màu sắc theo đúng thiết kế Bookle.
   - Kiểm tra hiển thị trên Desktop, Tablet và Mobile (< 768px).
   - Kiểm tra không bị tràn màn hình ngang (No horizontal overflow).
2. **Kiểm tra Tương tác & Nghiệp vụ:**
   - Thử click nút, chuyển tab danh mục, phân trang, đọc sách flipbook.
   - Thử chuyển đổi ngôn ngữ (VI/EN) xem giao diện có cập nhật mượt mà không.
3. **Console Error Check:**
   - Mở Console kiểm tra: **TUYỆT ĐỐI KHÔNG** có lỗi JS runtime mới (`Uncaught TypeError`, `404 Not Found`, CORS error, v.v.).
- **Bắt buộc giải phóng cổng sau khi kiểm thử (Mandatory Port Cleanup):**
  Sau khi hoàn thành các bước kiểm tra runtime trên `https://localhost:5000`, AI Agent **BẮT BUỘC** phải tắt/kill hoàn toàn tiến trình server đang chạy để giải phóng cổng 5000 (và 5001), đảm bảo người dùng có thể tự khởi chạy và kiểm thử lại trên máy của mình mà không bị lỗi xung đột cổng.

---

### BƯỚC 6 — VÒNG LẶP SỬA LỖI (FIX LOOP)
Nếu phát hiện bất kỳ lỗi nào ở Bước 4 hoặc Bước 5:
1. Xác định nguyên nhân gốc rễ (Root Cause).
2. Áp dụng giải pháp sửa chữa tối thiểu.
3. Chạy lại `dotnet build` và kiểm thử lại.
4. Giới hạn tối đa **5 lần lặp**. Nếu sau 5 lần vẫn bị nghẽn, phải dừng lại và báo cáo chi tiết nguyên nhân cho người dùng, **tuyệt đối không được báo cáo thành công giả mạo (Never fake verification)**.

---

## 3. CHECKLIST KIỂM TRA TRƯỚC KHI BÀN GIAO (DEFINITION OF DONE)

Một task CHỈ ĐƯỢC COI LÀ HOÀN THÀNH khi thỏa mãn 100% các tiêu chí:

### 1. Mã nguồn & Kiến trúc
- [ ] Tuân thủ cấu trúc MVC + BFF Proxy ở Mục I.
- [ ] Được phép update/sửa code nhưng **TUYỆT ĐỐI KHÔNG XÓA BẤT KỲ FILE NÀO**.
- [ ] Không sửa đổi file vendor gốc trong `assets/` và `book/`.
- [ ] Tái sử dụng component/class có sẵn của Bookle.
- [ ] Không có thay đổi kiến trúc hoặc refactor ngoài phạm vi yêu cầu.

### 2. Chức năng & Dữ liệu
- [ ] Giữ nguyên toàn bộ tính năng cũ (API calls, navigation, buttons).
- [ ] Hỗ trợ đầy đủ đa ngôn ngữ (`selectedLanguage`, `languageChanged`).
- [ ] Đảm bảo an toàn bảo mật (Có `escapeHtml`, URL proxy chống CORS).

### 3. Kiểm thử & Chất lượng
- [ ] Lệnh `dotnet build` hoàn thành với `0 Error(s)`.
- [ ] Ứng dụng khởi chạy và kiểm thử thành công trên **`https://localhost:5000`**.
- [ ] Đã tắt tiến trình server và giải phóng cổng 5000/5001 để người dùng tự test lại.
- [ ] Giao diện responsive tốt trên cả Desktop và Mobile.
- [ ] Không phát sinh lỗi đỏ mới trong Browser Console.

---

## 4. ĐỊNH DẠNG BÁO CÁO KẾT QUẢ (FINAL RESPONSE FORMAT)

Khi hoàn thành task, AI Agent bắt buộc phải tổng kết theo mẫu chuẩn sau:

```markdown
STATUS: SUCCESS

SUMMARY:
- Chi tiết những phần UI / Logic đã được thêm mới hoặc chỉnh sửa.
- Danh sách các file đã chỉnh sửa (kèm link clickable file://).
- Các chức năng hiện có đã được bảo toàn nguyên vẹn.

VALIDATION:
- Build (dotnet build): PASS (0 Errors)
- Static / Lint: PASS
- Browser / UI: PASS (Đã kiểm tra Desktop & Mobile)
- Console Check: PASS (Không có lỗi JavaScript mới)
- Đa ngôn ngữ: PASS

ACCEPTANCE CRITERIA:
- [Tiêu chí 1]: PASS
- [Tiêu chí 2]: PASS
```
