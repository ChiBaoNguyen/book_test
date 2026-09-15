using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;
using System.Text.Json;

namespace CreativeWeb.Controllers
{
    public class ProductController : Controller
    {
        private readonly IApiService _apiService;

        public ProductController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string pageSlug, string productSlug)
        {
            if (string.IsNullOrWhiteSpace(productSlug))
            {
                return NotFound();
            }

            // Get product by slug only
            var slugEndpoint = $"/api/Portal/products/slug/{Uri.EscapeDataString(productSlug)}";
            var product = await _apiService.GetAsync<ProductDto>(slugEndpoint);
            
            if (product == null)
            {
                return NotFound();
            }

            // Parse Image string (JSON array) to Images list if needed
            if (product.Images == null || product.Images.Count == 0)
            {
                if (!string.IsNullOrWhiteSpace(product.Image))
                {
                    try
                    {
                        // Try to parse the JSON string to List<string>
                        var images = JsonSerializer.Deserialize<List<string>>(product.Image);
                        if (images != null && images.Count > 0)
                        {
                            product.Images = images;
                        }
                    }
                    catch
                    {
                        // If parsing fails, try to extract URLs manually
                        // Handle case where Image might be a JSON array string
                        product.Images = ParseImageString(product.Image);
                    }
                }
            }

            ViewBag.Product = product;
            ViewBag.PageSlug = pageSlug;
            return View();
        }

        private List<string> ParseImageString(string? imageString)
        {
            var images = new List<string>();
            
            if (string.IsNullOrWhiteSpace(imageString))
            {
                return images;
            }

            try
            {
                // Try JSON deserialization first
                images = JsonSerializer.Deserialize<List<string>>(imageString);
                if (images != null)
                {
                    return images;
                }
            }
            catch
            {
                // If JSON parsing fails, try manual extraction
            }

            // Manual extraction: look for URLs in the string
            // Pattern: "https://..." or "http://..."
            var urlPattern = @"https?://[^\s""]+";
            var matches = System.Text.RegularExpressions.Regex.Matches(imageString, urlPattern);
            foreach (System.Text.RegularExpressions.Match match in matches)
            {
                if (!string.IsNullOrWhiteSpace(match.Value))
                {
                    images.Add(match.Value);
                }
            }

            return images;
        }
    }

    public class ProductDto
    {
        public string Id { get; set; } = "";
        public string? Image { get; set; } // JSON string from API
        public List<string>? Images { get; set; }
        public decimal? Price { get; set; }
        public decimal? DiscountPrice { get; set; }
        public bool Published { get; set; }
        public string? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public List<string>? CategoryIds { get; set; }
        public List<string>? CategoryNames { get; set; }
        public List<ProductTranslationDto>? Translations { get; set; }
    }

    public class ProductTranslationDto
    {
        public string Id { get; set; } = "";
        public string LanguageCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string? Content { get; set; } // Add Content property as fallback
        public string? UrlSlug { get; set; }
    }
}

