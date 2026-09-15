using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Net.Http.Headers;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace CreativeWeb.Controllers
{
    [ApiController]
    [Route("api/Portal")]
    public class PortalController : ControllerBase
    {
        private readonly IApiService _apiService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public PortalController(
            IApiService apiService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _apiService = apiService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        // Proxy endpoints for get by menu - use WebsiteKey authentication
        // These must be defined BEFORE the general endpoints to avoid routing conflicts
        [HttpGet("articles/menu/{menuId}/featured")]
        public async Task<IActionResult> GetFeaturedArticlesByMenu(string menuId, [FromQuery] int limit = 3)
        {
            try
            {
                var endpoint = $"/api/Portal/articles/menu/{Uri.EscapeDataString(menuId)}/featured?limit={limit}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching featured articles", error = ex.Message });
            }
        }

        [HttpGet("articles/menu/{menuId}")]
        public async Task<IActionResult> GetArticlesByMenu(
            string menuId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool excludeFeatured = false,
            [FromQuery] string? excludeArticleIds = null)
        {
            try
            {
                var queryParams = new List<string>
                {
                    $"pageNumber={pageNumber}",
                    $"pageSize={pageSize}"
                };
                if (excludeFeatured)
                {
                    queryParams.Add("excludeFeatured=true");
                }
                if (!string.IsNullOrWhiteSpace(excludeArticleIds))
                {
                    queryParams.Add($"excludeArticleIds={Uri.EscapeDataString(excludeArticleIds)}");
                }

                var endpoint = $"/api/Portal/articles/menu/{Uri.EscapeDataString(menuId)}?{string.Join("&", queryParams)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching articles", error = ex.Message });
            }
        }

        [HttpGet("articles/category-type/{categoryType}")]
        public async Task<IActionResult> GetArticlesByCategoryType(
            string categoryType,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                pageSize = Math.Clamp(pageSize, 1, 20);
                var queryParams = new List<string>
                {
                    $"pageNumber={pageNumber}",
                    $"pageSize={pageSize}"
                };
                if (!string.IsNullOrWhiteSpace(search))
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");

                var endpoint = $"/api/Portal/articles/category-type/{Uri.EscapeDataString(categoryType)}?{string.Join("&", queryParams)}";
                var raw = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(raw))
                {
                    return Ok(new
                    {
                        categoryType = categoryType,
                        items = new List<object>(),
                        totalItems = 0,
                        pageNumber = pageNumber,
                        pageSize = pageSize,
                        totalPages = 0
                    });
                }

                var payload = StripArticleListContent(raw);
                return Content(payload, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching articles", error = ex.Message });
            }
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories([FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = "/api/Portal/categories";
                if (!string.IsNullOrWhiteSpace(langCode))
                {
                    endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                }

                var json = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(json))
                {
                    return Ok(Array.Empty<object>());
                }

                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching categories.", error = ex.Message });
            }
        }

        private static string StripArticleListContent(string json)
        {
            try
            {
                var node = JsonNode.Parse(json);
                if (node?["items"] is JsonArray items)
                {
                    foreach (var item in items)
                    {
                        if (item?["translations"] is not JsonArray translations) continue;
                        foreach (var translation in translations)
                        {
                            translation?.AsObject()?.Remove("content");
                        }
                    }
                }

                return node?.ToJsonString() ?? json;
            }
            catch
            {
                return json;
            }
        }

        [HttpGet("products/menu/{menuId}")]
        public async Task<IActionResult> GetProductsByMenu(string menuId)
        {
            try
            {
                var endpoint = $"/api/Portal/products/menu/{Uri.EscapeDataString(menuId)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching products", error = ex.Message });
            }
        }

        [HttpGet("events/menu/{menuId}")]
        public async Task<IActionResult> GetEventsByMenu(string menuId)
        {
            try
            {
                var endpoint = $"/api/Portal/events/menu/{Uri.EscapeDataString(menuId)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching events", error = ex.Message });
            }
        }

        [HttpGet("books/menu/{menuId}")]
        public async Task<IActionResult> GetBooksByMenu(string menuId)
        {
            try
            {
                var endpoint = $"/api/Portal/books/menu/{Uri.EscapeDataString(menuId)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching books", error = ex.Message });
            }
        }

        // General proxy endpoints - must be defined AFTER specific routes
        [HttpGet("articles")]
        public async Task<IActionResult> GetArticles(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? categoryId = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var endpoint = "/api/Portal/articles";
                var queryParams = new List<string>();
                
                if (pageNumber > 0)
                {
                    queryParams.Add($"pageNumber={pageNumber}");
                }
                if (pageSize > 0)
                {
                    queryParams.Add($"pageSize={pageSize}");
                }
                if (!string.IsNullOrWhiteSpace(categoryId))
                {
                    queryParams.Add($"categoryId={Uri.EscapeDataString(categoryId)}");
                }
                if (!string.IsNullOrWhiteSpace(search))
                {
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");
                }
                
                if (queryParams.Any())
                {
                    endpoint += "?" + string.Join("&", queryParams);
                }
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = pageNumber, pageSize = pageSize, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching articles", error = ex.Message });
            }
        }

        [HttpGet("events")]
        public async Task<IActionResult> GetEvents(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? categoryId = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var endpoint = "/api/Portal/events";
                var queryParams = new List<string>();
                
                if (pageNumber > 0)
                {
                    queryParams.Add($"pageNumber={pageNumber}");
                }
                if (pageSize > 0)
                {
                    queryParams.Add($"pageSize={pageSize}");
                }
                if (!string.IsNullOrWhiteSpace(categoryId))
                {
                    queryParams.Add($"categoryId={Uri.EscapeDataString(categoryId)}");
                }
                if (!string.IsNullOrWhiteSpace(search))
                {
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");
                }
                
                if (queryParams.Any())
                {
                    endpoint += "?" + string.Join("&", queryParams);
                }
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = pageNumber, pageSize = pageSize, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching events", error = ex.Message });
            }
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? categoryId = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var endpoint = "/api/Portal/products";
                var queryParams = new List<string>();
                
                if (pageNumber > 0)
                {
                    queryParams.Add($"pageNumber={pageNumber}");
                }
                if (pageSize > 0)
                {
                    queryParams.Add($"pageSize={pageSize}");
                }
                if (!string.IsNullOrWhiteSpace(categoryId))
                {
                    queryParams.Add($"categoryId={Uri.EscapeDataString(categoryId)}");
                }
                if (!string.IsNullOrWhiteSpace(search))
                {
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");
                }
                
                if (queryParams.Any())
                {
                    endpoint += "?" + string.Join("&", queryParams);
                }
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = pageNumber, pageSize = pageSize, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching products", error = ex.Message });
            }
        }

        [HttpGet("books")]
        public async Task<IActionResult> GetBooks(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? categoryId = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var endpoint = "/api/Portal/books";
                var queryParams = new List<string>();
                
                if (pageNumber > 0)
                {
                    queryParams.Add($"pageNumber={pageNumber}");
                }
                if (pageSize > 0)
                {
                    queryParams.Add($"pageSize={pageSize}");
                }
                if (!string.IsNullOrWhiteSpace(categoryId))
                {
                    queryParams.Add($"categoryId={Uri.EscapeDataString(categoryId)}");
                }
                if (!string.IsNullOrWhiteSpace(search))
                {
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");
                }
                
                if (queryParams.Any())
                {
                    endpoint += "?" + string.Join("&", queryParams);
                }
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = pageNumber, pageSize = pageSize, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching books", error = ex.Message });
            }
        }

        [HttpGet("sliders/active")]
        public async Task<IActionResult> GetActiveSliders()
        {
            try
            {
                var endpoint = "/api/Portal/sliders/active";
                
                var sliders = await _apiService.GetAsync<List<object>>(endpoint);
                if (sliders == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(sliders);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching active sliders", error = ex.Message });
            }
        }

        [HttpGet("banners/code/{code}")]
        public async Task<IActionResult> GetBannerByCode(string code)
        {
            try
            {
                var endpoint = $"/api/Portal/banners/code/{Uri.EscapeDataString(code)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return NotFound(new { message = "Banner not found." });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the banner.", error = ex.Message });
            }
        }

        [HttpGet("footers/active")]
        public async Task<IActionResult> GetActiveFooters()
        {
            try
            {
                var endpoint = "/api/Portal/footers/active";
                
                var footers = await _apiService.GetAsync<List<object>>(endpoint);
                if (footers == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(footers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching active footers", error = ex.Message });
            }
        }

        [HttpGet("footers")]
        public async Task<IActionResult> GetAllFooters([FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = "/api/Portal/footers";
                if (!string.IsNullOrWhiteSpace(langCode))
                {
                    endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                }
                
                var footers = await _apiService.GetAsync<List<object>>(endpoint);
                if (footers == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(footers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching footers", error = ex.Message });
            }
        }

        [HttpGet("menus/root/{rootMenuId}")]
        public async Task<IActionResult> GetMenusByRootMenuId(string rootMenuId)
        {
            try
            {
                var endpoint = $"/api/Portal/menus/root/{rootMenuId}";
                
                var menus = await _apiService.GetAsync<List<object>>(endpoint);
                if (menus == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(menus);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching menus", error = ex.Message });
            }
        }

        [HttpGet("titleSections")]
        public async Task<IActionResult> GetTitleSections()
        {
            try
            {
                var endpoint = "/api/Portal/titleSections";
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 1000, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching title sections", error = ex.Message });
            }
        }

        [HttpGet("articles/featured")]
        public async Task<IActionResult> GetFeaturedArticles()
        {
            try
            {
                var endpoint = "/api/Portal/articles/featured";
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching featured articles", error = ex.Message });
            }
        }

        [HttpGet("products/featured")]
        public async Task<IActionResult> GetFeaturedProducts()
        {
            try
            {
                var endpoint = "/api/Portal/products/featured";
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching featured products", error = ex.Message });
            }
        }

        [HttpGet("events/featured")]
        public async Task<IActionResult> GetFeaturedEvents()
        {
            try
            {
                var endpoint = "/api/Portal/events/featured";
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching featured events", error = ex.Message });
            }
        }

        [HttpGet("books/featured")]
        public async Task<IActionResult> GetFeaturedBooks()
        {
            try
            {
                var endpoint = "/api/Portal/books/featured";
                
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching featured books", error = ex.Message });
            }
        }

        [HttpGet("packagedPrices")]
        public async Task<IActionResult> GetPackagedPrices()
        {
            try
            {
                var endpoint = "/api/Portal/packagedPrices";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 1000, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching packaged prices", error = ex.Message });
            }
        }

        [HttpGet("partners/active")]
        public async Task<IActionResult> GetActivePartners()
        {
            try
            {
                var endpoint = "/api/Portal/partners/active";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching active partners", error = ex.Message });
            }
        }

        [HttpGet("featureLists")]
        public async Task<IActionResult> GetFeatureLists()
        {
            try
            {
                var endpoint = "/api/Portal/featureLists";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 1000, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching feature lists", error = ex.Message });
            }
        }

        [HttpGet("featureLists/code/{featureCode}")]
        public async Task<IActionResult> GetFeatureListByCode(string featureCode)
        {
            try
            {
                var endpoint = $"/api/Portal/featureLists/code/{Uri.EscapeDataString(featureCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return NotFound(new { message = "Feature list not found" });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching feature list", error = ex.Message });
            }
        }

        /// <summary>
        /// Stream video from CDN with correct Content-Type and Range support (iOS Safari).
        /// </summary>
        [HttpGet("proxy/video")]
        [HttpHead("proxy/video")]
        public Task<IActionResult> ProxyVideo([FromQuery] string url) => ProxyStream(url, forceVideoType: true);

        [HttpGet("proxy/video/b64/{encoded}")]
        [HttpHead("proxy/video/b64/{encoded}")]
        public Task<IActionResult> ProxyVideoBase64(string encoded)
        {
            var decoded = DecodeBase64Url(encoded);
            return ProxyStream(decoded, forceVideoType: true);
        }

        /// <summary>
        /// Proxy endpoint to fetch files from CDN without CORS issues
        /// Supports both GET and HEAD methods
        /// </summary>
        [HttpGet("proxy/file")]
        [HttpHead("proxy/file")]
        public Task<IActionResult> ProxyFile([FromQuery] string url) => ProxyStream(url, forceVideoType: false);

        private async Task<IActionResult> ProxyStream(string? url, bool forceVideoType)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(url))
                {
                    return BadRequest(new { message = "URL parameter is required" });
                }

                var decodedUrl = Uri.UnescapeDataString(url);

                if (!TryParseProxyUrl(decodedUrl, out var uri))
                {
                    return BadRequest(new { message = "Invalid URL format. Only http/https URLs are allowed" });
                }

                if (!IsAllowedCdnHost(uri.Host))
                {
                    return BadRequest(new { message = "CDN host is not allowed" });
                }

                var targetUrl = NormalizeToHttps(decodedUrl, uri);

                // iOS Safari: redirect to CDN for initial load (avoids IIS proxy buffering/chunking).
                if (forceVideoType && !Request.Headers.ContainsKey("Range"))
                {
                    return Redirect(targetUrl);
                }

                var httpClient = _httpClientFactory.CreateClient("CdnProxy");
                using var request = new HttpRequestMessage(
                    Request.Method == "HEAD" ? HttpMethod.Head : HttpMethod.Get,
                    targetUrl);

                if (Request.Headers.TryGetValue("Range", out var rangeHeader))
                {
                    request.Headers.TryAddWithoutValidation("Range", rangeHeader.ToString());
                }

                using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode &&
                    response.StatusCode != System.Net.HttpStatusCode.PartialContent)
                {
                    return StatusCode((int)response.StatusCode, new { message = "Failed to fetch file from CDN" });
                }

                var upstreamType = response.Content.Headers.ContentType?.MediaType;
                var contentType = ResolveProxyContentType(targetUrl, upstreamType);

                if (forceVideoType && contentType.StartsWith("application/", StringComparison.OrdinalIgnoreCase))
                {
                    contentType = ResolveProxyContentType(targetUrl, null);
                }

                var contentLength = response.Content.Headers.ContentLength;
                var clientRange = Request.Headers.Range.ToString();

                Response.ContentType = contentType;
                Response.Headers.ContentDisposition = "inline";
                Response.Headers.AcceptRanges = "bytes";
                Response.Headers.Remove("Content-Encoding");
                Response.Headers.Append("Cache-Control", "public, max-age=3600");

                if (response.Content.Headers.TryGetValues("Content-Range", out var contentRange))
                {
                    Response.StatusCode = (int)response.StatusCode;
                    Response.Headers.ContentRange = contentRange.ToArray();
                    if (contentLength.HasValue)
                    {
                        Response.ContentLength = contentLength.Value;
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.OK &&
                         !string.IsNullOrEmpty(clientRange) &&
                         contentLength.HasValue)
                {
                    Response.StatusCode = StatusCodes.Status200OK;
                }
                else
                {
                    Response.StatusCode = (int)response.StatusCode;
                    if (contentLength.HasValue)
                    {
                        Response.ContentLength = contentLength.Value;
                    }
                }

                if (Request.Method == "HEAD")
                {
                    if (response.StatusCode == System.Net.HttpStatusCode.OK &&
                        !string.IsNullOrEmpty(clientRange) &&
                        contentLength.HasValue &&
                        RangeHeaderValue.TryParse(clientRange, out var rangeValue) &&
                        rangeValue.Ranges.Count == 1)
                    {
                        var range = rangeValue.Ranges.First();
                        var start = range.From ?? 0;
                        var end = range.To ?? contentLength.Value - 1;
                        end = Math.Min(end, contentLength.Value - 1);
                        Response.StatusCode = StatusCodes.Status206PartialContent;
                        Response.Headers.ContentRange = new ContentRangeHeaderValue(start, end, contentLength.Value).ToString();
                        Response.ContentLength = end - start + 1;
                    }

                    return new EmptyResult();
                }

                await using var fileStream = await response.Content.ReadAsStreamAsync();

                if (response.StatusCode == System.Net.HttpStatusCode.PartialContent)
                {
                    await fileStream.CopyToAsync(Response.Body);
                    return new EmptyResult();
                }

                await CopyStreamWithClientRangeAsync(fileStream, contentLength, clientRange, Response);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching file", error = ex.Message });
            }
        }

        private static string? DecodeBase64Url(string encoded)
        {
            if (string.IsNullOrWhiteSpace(encoded))
            {
                return null;
            }

            try
            {
                var padded = encoded.Replace('-', '+').Replace('_', '/');
                padded = (padded.Length % 4) switch
                {
                    2 => padded + "==",
                    3 => padded + "=",
                    _ => padded
                };
                return Encoding.UTF8.GetString(Convert.FromBase64String(padded));
            }
            catch
            {
                return null;
            }
        }

        private static bool TryParseProxyUrl(string decodedUrl, out Uri uri)
        {
            return Uri.TryCreate(decodedUrl, UriKind.Absolute, out uri!) &&
                   (uri.Scheme == "http" || uri.Scheme == "https");
        }

        private static string NormalizeToHttps(string decodedUrl, Uri uri)
        {
            if (uri.Scheme == "http")
            {
                var builder = new UriBuilder(uri) { Scheme = "https", Port = -1 };
                return builder.Uri.ToString();
            }

            return decodedUrl;
        }

        private bool IsAllowedCdnHost(string host)
        {
            var allowedHosts = _configuration["CdnSettings:AllowedHosts"];
            if (string.IsNullOrWhiteSpace(allowedHosts))
            {
                return true;
            }

            return allowedHosts
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(h => string.Equals(h, host, StringComparison.OrdinalIgnoreCase));
        }

        private static async Task CopyStreamWithClientRangeAsync(
            Stream source,
            long? totalLength,
            string? rangeHeader,
            HttpResponse response)
        {
            if (string.IsNullOrEmpty(rangeHeader) ||
                !RangeHeaderValue.TryParse(rangeHeader, out var rangeValue) ||
                rangeValue.Ranges.Count != 1 ||
                !totalLength.HasValue)
            {
                if (totalLength.HasValue)
                {
                    response.ContentLength = totalLength.Value;
                }

                await source.CopyToAsync(response.Body);
                return;
            }

            var range = rangeValue.Ranges.First();
            var start = range.From ?? 0;
            var end = range.To ?? totalLength.Value - 1;
            if (start >= totalLength.Value)
            {
                response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
                response.Headers.ContentRange = new ContentRangeHeaderValue(totalLength.Value).ToString();
                return;
            }

            end = Math.Min(end, totalLength.Value - 1);
            var count = end - start + 1;

            if (start > 0)
            {
                var skipBuffer = new byte[81920];
                long skipped = 0;
                while (skipped < start)
                {
                    var toRead = (int)Math.Min(skipBuffer.Length, start - skipped);
                    var read = await source.ReadAsync(skipBuffer.AsMemory(0, toRead));
                    if (read == 0)
                    {
                        break;
                    }

                    skipped += read;
                }
            }

            response.StatusCode = StatusCodes.Status206PartialContent;
            response.Headers.ContentRange = new ContentRangeHeaderValue(start, end, totalLength.Value).ToString();
            response.ContentLength = count;

            var buffer = new byte[81920];
            var remaining = count;
            while (remaining > 0)
            {
                var toRead = (int)Math.Min(buffer.Length, remaining);
                var read = await source.ReadAsync(buffer.AsMemory(0, toRead));
                if (read == 0)
                {
                    break;
                }

                await response.Body.WriteAsync(buffer.AsMemory(0, read));
                remaining -= read;
            }
        }

        private static string ResolveProxyContentType(string url, string? mediaType)
        {
            if (!string.IsNullOrWhiteSpace(mediaType) &&
                !mediaType.Equals("application/octet-stream", StringComparison.OrdinalIgnoreCase))
            {
                return mediaType;
            }

            var path = url;
            var queryIndex = path.IndexOf('?', StringComparison.Ordinal);
            if (queryIndex >= 0)
            {
                path = path[..queryIndex];
            }

            var ext = Path.GetExtension(path).ToLowerInvariant();
            return ext switch
            {
                ".mp4" or ".m4v" => "video/mp4",
                ".mov" => "video/mp4",
                ".webm" => "video/webm",
                ".ogg" or ".ogv" => "video/ogg",
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => string.IsNullOrWhiteSpace(mediaType) ? "application/octet-stream" : mediaType
            };
        }

        // Record Traffic
        [HttpPost("traffic")]
        public async Task<IActionResult> RecordTraffic([FromBody] object dto)
        {
            try
            {
                var endpoint = "/api/Portal/traffic";
                var result = await _apiService.PostAsync<object>(endpoint, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while recording traffic", error = ex.Message });
            }
        }

        // Get Notifications
        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
        {
            try
            {
                var queryParams = new List<string>();
                queryParams.Add($"pageNumber={pageNumber}");
                queryParams.Add($"pageSize={pageSize}");
                if (!string.IsNullOrWhiteSpace(search))
                {
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");
                }
                var endpoint = $"/api/Portal/notifications?{string.Join("&", queryParams)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 20, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching notifications", error = ex.Message });
            }
        }

        [HttpGet("notification/{id}")]
        public async Task<IActionResult> GetNotificationById(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                {
                    return BadRequest(new { message = "Id is required." });
                }

                var endpoint = $"/api/Portal/notification/{Uri.EscapeDataString(id)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return NotFound(new { message = "Notification not found." });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching notification", error = ex.Message });
            }
        }

        [HttpGet("faqs/active")]
        public async Task<IActionResult> GetActiveFaqs(
            [FromQuery] string? langCode = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var queryParams = new List<string>();
                if (!string.IsNullOrWhiteSpace(langCode))
                    queryParams.Add($"langCode={Uri.EscapeDataString(langCode)}");
                if (!string.IsNullOrWhiteSpace(search))
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");

                var endpoint = queryParams.Count > 0
                    ? $"/api/Portal/faqs/active?{string.Join("&", queryParams)}"
                    : "/api/Portal/faqs/active";

                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 1000, totalPages = 0 });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching active FAQs", error = ex.Message });
            }
        }

        [HttpGet("faqs")]
        public async Task<IActionResult> GetFaqs(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? langCode = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var queryParams = new List<string>
                {
                    $"pageNumber={pageNumber}",
                    $"pageSize={pageSize}"
                };
                if (!string.IsNullOrWhiteSpace(langCode))
                    queryParams.Add($"langCode={Uri.EscapeDataString(langCode)}");
                if (!string.IsNullOrWhiteSpace(search))
                    queryParams.Add($"search={Uri.EscapeDataString(search)}");

                var endpoint = $"/api/Portal/faqs?{string.Join("&", queryParams)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                    return Ok(new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 100, totalPages = 0 });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching FAQs", error = ex.Message });
            }
        }

        [HttpGet("faq/{id}")]
        public async Task<IActionResult> GetFaqById(string id, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/faq/{Uri.EscapeDataString(id)}";
                if (!string.IsNullOrWhiteSpace(langCode))
                    endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";

                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                    return NotFound(new { message = "FAQ not found." });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the FAQ.", error = ex.Message });
            }
        }

        [HttpGet("timelines")]
        public async Task<IActionResult> GetTimelines(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? langCode = null,
            [FromQuery] string? search = null,
            [FromQuery] string? timelineCode = null)
        {
            try
            {
                var queryParams = new List<string> { $"pageNumber={pageNumber}", $"pageSize={pageSize}" };
                if (!string.IsNullOrWhiteSpace(langCode)) queryParams.Add($"langCode={Uri.EscapeDataString(langCode)}");
                if (!string.IsNullOrWhiteSpace(search)) queryParams.Add($"search={Uri.EscapeDataString(search)}");
                if (!string.IsNullOrWhiteSpace(timelineCode)) queryParams.Add($"timelineCode={Uri.EscapeDataString(timelineCode)}");

                var result = await _apiService.GetAsync<object>($"/api/Portal/timelines?{string.Join("&", queryParams)}");
                return Ok(result ?? new { items = new List<object>(), totalItems = 0, pageNumber = 1, pageSize = 100, totalPages = 0 });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching timelines", error = ex.Message });
            }
        }

        [HttpGet("timeline/{id}")]
        public async Task<IActionResult> GetTimelineById(string id, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/timeline/{Uri.EscapeDataString(id)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null) return NotFound(new { message = "Timeline not found." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the timeline.", error = ex.Message });
            }
        }

        [HttpGet("timelines/code/{timelineCode}")]
        public async Task<IActionResult> GetTimelineByCode(string timelineCode, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/timelines/code/{Uri.EscapeDataString(timelineCode)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null) return NotFound(new { message = "Timeline not found." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the timeline.", error = ex.Message });
            }
        }

        [HttpGet("blocks")]
        public async Task<IActionResult> GetBlocks([FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = "/api/Portal/blocks";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null) return Ok(new { items = Array.Empty<object>(), totalItems = 0, pageNumber = 1, pageSize = 1000, totalPages = 0 });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching blocks.", error = ex.Message });
            }
        }

        [HttpGet("blocks/code/{blockCode}")]
        public async Task<IActionResult> GetBlockByCode(string blockCode, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/blocks/code/{Uri.EscapeDataString(blockCode)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null) return NotFound(new { message = "Block not found." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the block.", error = ex.Message });
            }
        }

        [HttpGet("gallery/albums")]
        public async Task<IActionResult> GetGalleryAlbums(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? albumType = null,
            [FromQuery] string? excludeCode = null,
            [FromQuery] string? langCode = null)
        {
            try
            {
                var query = new List<string>
                {
                    $"pageNumber={pageNumber}",
                    $"pageSize={pageSize}"
                };
                if (!string.IsNullOrWhiteSpace(albumType)) query.Add($"albumType={Uri.EscapeDataString(albumType)}");
                if (!string.IsNullOrWhiteSpace(excludeCode)) query.Add($"excludeCode={Uri.EscapeDataString(excludeCode)}");
                if (!string.IsNullOrWhiteSpace(langCode)) query.Add($"langCode={Uri.EscapeDataString(langCode)}");

                var endpoint = "/api/Portal/gallery/albums?" + string.Join("&", query);
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = Array.Empty<object>(), totalItems = 0, pageNumber = 1, pageSize = pageSize, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching gallery albums.", error = ex.Message });
            }
        }

        [HttpGet("gallery/images/published")]
        public async Task<IActionResult> GetPublishedGalleryImages(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? albumCode = null,
            [FromQuery] string? albumType = null,
            [FromQuery] string? langCode = null)
        {
            try
            {
                var query = new List<string>
                {
                    $"pageNumber={pageNumber}",
                    $"pageSize={pageSize}"
                };
                if (!string.IsNullOrWhiteSpace(albumCode)) query.Add($"albumCode={Uri.EscapeDataString(albumCode)}");
                if (!string.IsNullOrWhiteSpace(albumType)) query.Add($"albumType={Uri.EscapeDataString(albumType)}");
                if (!string.IsNullOrWhiteSpace(langCode)) query.Add($"langCode={Uri.EscapeDataString(langCode)}");

                var endpoint = "/api/Portal/gallery/images/published?" + string.Join("&", query);
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null)
                {
                    return Ok(new { items = Array.Empty<object>(), totalItems = 0, pageNumber = 1, pageSize = pageSize, totalPages = 0 });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching published gallery images.", error = ex.Message });
            }
        }

        [HttpGet("gallery/album/{id}")]
        public async Task<IActionResult> GetGalleryAlbumById(string id, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/gallery/album/{Uri.EscapeDataString(id)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null) return NotFound(new { message = "Album not found." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the album.", error = ex.Message });
            }
        }

        [HttpGet("gallery/albums/code/{albumCode}")]
        public async Task<IActionResult> GetGalleryAlbumByCode(string albumCode, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/gallery/albums/code/{Uri.EscapeDataString(albumCode)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var result = await _apiService.GetAsync<object>(endpoint);
                if (result == null) return NotFound(new { message = "Album not found." });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the album.", error = ex.Message });
            }
        }

        [HttpGet("locations/categories")]
        public async Task<IActionResult> GetLocationCategories([FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = "/api/Portal/locations/categories";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var json = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(json))
                    return Ok(new { items = Array.Empty<object>(), totalItems = 0 });
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching location categories.", error = ex.Message });
            }
        }

        [HttpGet("locations/map")]
        public async Task<IActionResult> GetLocationMapPoints([FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = "/api/Portal/locations/map";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var json = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(json))
                    return Ok(new { items = Array.Empty<object>(), totalItems = 0 });
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching location map points.", error = ex.Message });
            }
        }

        [HttpGet("locations")]
        public async Task<IActionResult> GetLocations(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? langCode = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var query = new List<string>
                {
                    $"pageNumber={pageNumber}",
                    $"pageSize={pageSize}"
                };
                if (!string.IsNullOrWhiteSpace(langCode)) query.Add($"langCode={Uri.EscapeDataString(langCode)}");
                if (!string.IsNullOrWhiteSpace(search)) query.Add($"search={Uri.EscapeDataString(search)}");

                var endpoint = $"/api/Portal/locations?{string.Join("&", query)}";
                var json = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(json))
                    return Ok(new { items = Array.Empty<object>(), totalItems = 0, pageNumber, pageSize, totalPages = 0 });
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching locations.", error = ex.Message });
            }
        }

        [HttpGet("locations/code/{code}")]
        public async Task<IActionResult> GetLocationByCode(string code, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/locations/code/{Uri.EscapeDataString(code)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var json = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(json)) return NotFound(new { message = "Location not found." });
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the location.", error = ex.Message });
            }
        }

        [HttpGet("locations/{id}")]
        public async Task<IActionResult> GetLocationById(string id, [FromQuery] string? langCode = null)
        {
            try
            {
                var endpoint = $"/api/Portal/locations/{Uri.EscapeDataString(id)}";
                if (!string.IsNullOrWhiteSpace(langCode)) endpoint += $"?langCode={Uri.EscapeDataString(langCode)}";
                var json = await _apiService.GetRawAsync(endpoint);
                if (string.IsNullOrWhiteSpace(json)) return NotFound(new { message = "Location not found." });
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching the location.", error = ex.Message });
            }
        }
    }
}
