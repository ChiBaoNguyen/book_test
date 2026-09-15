using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;

namespace CreativeWeb.Controllers
{
    public class ArticleController : Controller
    {
        private readonly IApiService _apiService;

        public ArticleController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string pageSlug, string articleSlug)
        {
            if (string.IsNullOrWhiteSpace(articleSlug))
            {
                return NotFound();
            }

            // Get article by slug only
            var slugEndpoint = $"/api/Portal/articles/slug/{Uri.EscapeDataString(articleSlug)}";
            var article = await _apiService.GetAsync<ArticleDto>(slugEndpoint);
            
            if (article == null)
            {
                return NotFound();
            }

            ViewBag.Article = article;
            ViewBag.PageSlug = pageSlug;
            return View();
        }
    }

    public class ArticleDto
    {
        public string Id { get; set; } = "";
        public string? Image { get; set; }
        public bool Published { get; set; }
        public DateTime? DateAdd { get; set; }
        public string? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public List<string>? CategoryIds { get; set; }
        public List<string>? CategoryNames { get; set; }
        public List<ArticleTranslationDto>? Translations { get; set; }
    }

    public class ArticleTranslationDto
    {
        public string Id { get; set; } = "";
        public string LanguageCode { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Summary { get; set; }
        public string Content { get; set; } = "";
        public string? Description { get; set; } // Add Description property as fallback
        public string? UrlSlug { get; set; }
    }
}

