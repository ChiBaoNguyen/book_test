using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;
using CreativeWeb.Helpers;

namespace CreativeWeb.Controllers
{
    public class PageController : Controller
    {
        private readonly IApiService _apiService;

        public PageController(IApiService apiService)
        {
            _apiService = apiService;
        }

        public async Task<IActionResult> Index(string slug)
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return NotFound();
            }

            // Get current language
            var langCode = Request.Query["lang"].ToString();
            if (string.IsNullOrWhiteSpace(langCode))
            {
                langCode = Request.Cookies["selectedLanguage"] ?? "vi";
            }

            // Try to get menu info by slug to get menuId
            string? menuId = null;
            string? menuTitle = null;
            try
            {
                // Load all menus to find by urlSlug
                var menus = await _apiService.GetPrimaryMenuAsync();
                if (menus != null)
                {
                    // Find menu by urlSlug in translations
                    var menu = MenuPageHelper.FindMenuBySlug(menus, slug);
                    if (menu != null)
                    {
                        menuId = menu.Id;
                        menuTitle = MenuPageHelper.GetMenuTitle(menu, langCode);
                    }
                }
            }
            catch
            {
                // If menu lookup fails, continue without menuId
            }

            ViewBag.PageSlug = slug;
            ViewBag.LangCode = langCode;
            ViewBag.MenuId = menuId;
            ViewData["Title"] = !string.IsNullOrWhiteSpace(menuTitle) ? menuTitle : "Danh sách nội dung";

            return View();
        }
    }
}

