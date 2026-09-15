using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;

namespace CreativeWeb.Controllers
{
    public class EventController : Controller
    {
        private readonly IApiService _apiService;

        public EventController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string pageSlug, string eventSlug)
        {
            if (string.IsNullOrWhiteSpace(eventSlug))
            {
                return NotFound();
            }

            // Get event by slug only
            var slugEndpoint = $"/api/Portal/events/slug/{Uri.EscapeDataString(eventSlug)}";
            var eventEntity = await _apiService.GetAsync<EventDto>(slugEndpoint);
            
            if (eventEntity == null || !eventEntity.Published)
            {
                return NotFound();
            }

            // Map Description to Content if Content is empty (for API compatibility)
            if (eventEntity.Translations != null)
            {
                foreach (var translation in eventEntity.Translations)
                {
                    if (string.IsNullOrWhiteSpace(translation.Content) && !string.IsNullOrWhiteSpace(translation.Description))
                    {
                        translation.Content = translation.Description;
                    }
                }
            }

            ViewBag.Event = eventEntity;
            ViewBag.PageSlug = pageSlug;
            return View();
        }
    }

    public class EventDto
    {
        public string Id { get; set; } = "";
        public string? Image { get; set; }
        public bool Published { get; set; }
        public DateTime? EventDate { get; set; }
        public string? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public List<string>? CategoryIds { get; set; }
        public List<string>? CategoryNames { get; set; }
        public List<string>? MenuIds { get; set; }
        public List<EventTranslationDto>? Translations { get; set; }
    }

    public class EventTranslationDto
    {
        public string Id { get; set; } = "";
        public string LanguageCode { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Summary { get; set; }
        public string? Content { get; set; } = "";
        public string? Description { get; set; } = ""; // API may return Description instead of Content
        public string? UrlSlug { get; set; }
    }
}

