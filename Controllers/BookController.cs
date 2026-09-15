using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;

namespace CreativeWeb.Controllers
{
    public class BookController : Controller
    {
        private readonly IApiService _apiService;

        public BookController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string pageSlug, string bookSlug)
        {
            if (string.IsNullOrWhiteSpace(bookSlug))
            {
                return NotFound();
            }

            // Get book by slug only
            var slugEndpoint = $"/api/Portal/books/slug/{Uri.EscapeDataString(bookSlug)}";
            var book = await _apiService.GetAsync<BookDto>(slugEndpoint);
            
            if (book == null)
            {
                return NotFound();
            }

            // Map Description to Content if Content is empty (for API compatibility)
            if (book.Translations != null)
            {
                foreach (var translation in book.Translations)
                {
                    if (string.IsNullOrWhiteSpace(translation.Content) && !string.IsNullOrWhiteSpace(translation.Description))
                    {
                        translation.Content = translation.Description;
                    }
                }
            }

            ViewBag.Book = book;
            ViewBag.PageSlug = pageSlug;
            return View();
        }
    }

    public class BookDto
    {
        public string Id { get; set; } = "";
        public string? Thumbnail { get; set; }
        public string? PdfFile { get; set; }
        public string? ISBN { get; set; }
        public int? PublishYear { get; set; }
        public string? Author { get; set; }
        public string? Publisher { get; set; }
        public string? Tags { get; set; }
        public int? PageCount { get; set; }
        public bool Published { get; set; }
        public string? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public List<string>? CategoryIds { get; set; }
        public List<string>? CategoryNames { get; set; }
        public List<BookTranslationDto>? Translations { get; set; }
    }

    public class BookTranslationDto
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

