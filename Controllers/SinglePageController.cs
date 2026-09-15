using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;
using System.Text.Json.Serialization;

namespace CreativeWeb.Controllers
{
    public class SinglePageController : Controller
    {
        private readonly IApiService _apiService;

        public SinglePageController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string slug)
        {
            try
            {
                // Load single post content by slug or id from API
                if (string.IsNullOrWhiteSpace(slug))
                {
                    return NotFound();
                }

                // Get current language from query string, cookie, or default
                var langCode = Request.Query["lang"].ToString();
                if (string.IsNullOrWhiteSpace(langCode))
                {
                    langCode = Request.Cookies["selectedLanguage"] ?? "vi"; // Default language
                }

                // Try to get by slug first, if fails try by ID
                // Note: slug endpoint doesn't require langCode - it searches across all translations
                var endpoint = $"/api/Portal/singlepost/slug/{Uri.EscapeDataString(slug)}";

                var singlePost = await _apiService.GetAsync<SinglePostDto>(endpoint);

                // If not found by slug, try by ID (in case slug is actually an ID)
                if (singlePost == null)
                {
                    endpoint = $"/api/Portal/singlepost/{Uri.EscapeDataString(slug)}";
                    if (!string.IsNullOrWhiteSpace(langCode))
                    {
                        endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                    }
                    singlePost = await _apiService.GetAsync<SinglePostDto>(endpoint);
                }

                if (singlePost == null)
                {
                    return NotFound();
                }

                ViewBag.SinglePost = singlePost;
                return View();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }

    public class SinglePostDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";
        
        [JsonPropertyName("published")]
        public bool Published { get; set; }
        
        [JsonPropertyName("dateAdd")]
        public DateTime? DateAdd { get; set; }
        
        [JsonPropertyName("translations")]
        public List<SinglePostTranslationDto>? Translations { get; set; }
    }

    public class SinglePostTranslationDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";
        
        [JsonPropertyName("languageCode")]
        public string LanguageCode { get; set; } = "";
        
        [JsonPropertyName("title")]
        public string Title { get; set; } = "";
        
        [JsonPropertyName("description")]
        public string Description { get; set; } = "";
        
        [JsonPropertyName("content")]
        public string Content { get; set; } = "";
        
        [JsonPropertyName("urlSlug")]
        public string UrlSlug { get; set; } = "";
    }
}
