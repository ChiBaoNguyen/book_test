using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;

namespace CreativeWeb.Controllers
{
    public class NotificationController : Controller
    {
        private readonly IApiService _apiService;

        public NotificationController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return NotFound();
            }

            var endpoint = $"/api/Portal/notification/{Uri.EscapeDataString(id)}";
            var notification = await _apiService.GetAsync<NotificationDto>(endpoint);

            if (notification == null || !notification.Published)
            {
                return NotFound();
            }

            ViewBag.Notification = notification;
            return View();
        }
    }

    public class NotificationDto
    {
        public string Id { get; set; } = "";
        public string? Image { get; set; }
        public DateTime? DateAdd { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public bool Published { get; set; }
        public List<NotificationTranslationDto>? Translations { get; set; }
    }

    public class NotificationTranslationDto
    {
        public string Id { get; set; } = "";
        public string LanguageCode { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Content { get; set; }
    }
}
