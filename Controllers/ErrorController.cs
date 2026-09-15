using Microsoft.AspNetCore.Mvc;

namespace CreativeWeb.Controllers
{
    public class ErrorController : Controller
    {
        [Route("error/{statusCode}")]
        public IActionResult Index(int statusCode)
        {
            ViewData["Title"] = $"{statusCode} - Error";
            Response.StatusCode = statusCode;

            return statusCode switch
            {
                401 => View("~/Views/Error/Error401.cshtml"),
                403 => View("~/Views/Error/Error403.cshtml"),
                404 => View("~/Views/Error/Error404.cshtml"),
                _ => View("~/Views/Error/Error404.cshtml")
            };
        }

        [Route("error/401")]
        public IActionResult Error401()
        {
            ViewData["Title"] = "401 - Unauthorized";
            Response.StatusCode = 401;
            return View();
        }

        [Route("error/403")]
        public IActionResult Error403()
        {
            ViewData["Title"] = "403 - Forbidden";
            Response.StatusCode = 403;
            return View();
        }

        [Route("error/404")]
        public IActionResult Error404()
        {
            ViewData["Title"] = "404 - Not Found";
            Response.StatusCode = 404;
            return View();
        }
    }
}

