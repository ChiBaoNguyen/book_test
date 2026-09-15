using CreativeWeb.Models;
using CreativeWeb.Services;
using CreativeWeb.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace CreativeWeb.Controllers
{
    public class ContactController : Controller
    {
        private readonly IApiService _apiService;

        public ContactController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index()
        {
            var langCode = Request.Cookies["selectedLanguage"] ?? "vi";
            string? menuTitle = null;

            try
            {
                var menus = await _apiService.GetPrimaryMenuAsync();
                if (menus != null)
                {
                    var menu = MenuPageHelper.FindMenuBySlug(menus, "contact");
                    if (menu != null)
                    {
                        menuTitle = MenuPageHelper.GetMenuTitle(menu, langCode);
                    }
                }
            }
            catch
            {
                // continue with default title
            }

            ViewData["Title"] = !string.IsNullOrWhiteSpace(menuTitle) ? menuTitle : "Liên hệ";
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Submit([FromBody] ContactSubmitDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            }

            // Validate required fields
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập họ và tên." });
            }

            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập email." });
            }

            if (string.IsNullOrWhiteSpace(dto.Subject))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập chủ đề." });
            }

            if (string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập nội dung tin nhắn." });
            }

            // Call API
            var result = await _apiService.PostAsync<ContactApiResponse>("/api/Portal/contact", new
            {
                name = dto.Name,
                email = dto.Email,
                phone = dto.Phone,
                subject = dto.Subject,
                message = dto.Message
            });

            if (result != null && result.Success)
            {
                return Ok(new { success = true, message = result.Message ?? "Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể." });
            }

            return BadRequest(new { success = false, message = result?.Message ?? "Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau." });
        }
    }

    public class ContactSubmitDto
    {
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string Subject { get; set; } = "";
        public string Message { get; set; } = "";
    }

    public class ContactApiResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? ContactId { get; set; }
    }
}

