using CreativeWeb.Helpers;
using CreativeWeb.Services;
using Microsoft.AspNetCore.Mvc;

namespace CreativeWeb.Controllers
{
    public class EventsController : Controller
    {
        private readonly IApiService _apiService;

        public EventsController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index()
        {
            await SetPageTitleAsync("events", "su-kien", "lich-su-kien");
            return View();
        }

        private async Task SetPageTitleAsync(params string[] slugs)
        {
            var langCode = Request.Cookies["selectedLanguage"] ?? "vi";
            string? menuTitle = null;

            try
            {
                var menus = await _apiService.GetPrimaryMenuAsync();
                if (menus != null)
                {
                    foreach (var slug in slugs)
                    {
                        var menu = MenuPageHelper.FindMenuBySlug(menus, slug);
                        if (menu != null)
                        {
                            menuTitle = MenuPageHelper.GetMenuTitle(menu, langCode);
                            break;
                        }
                    }
                }
            }
            catch
            {
                // use default title
            }

            ViewData["Title"] = !string.IsNullOrWhiteSpace(menuTitle) ? menuTitle : "Sự kiện";
        }
    }
}
