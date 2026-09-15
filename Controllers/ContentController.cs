using Microsoft.AspNetCore.Mvc;

namespace CreativeWeb.Controllers
{
    public class ContentController : Controller
    {
        public IActionResult Index(int id)
        {
            // Load detail content by id
            return View();
        }
    }
}

