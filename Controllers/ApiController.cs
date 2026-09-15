using Microsoft.AspNetCore.Mvc;
using CreativeWeb.Services;

namespace CreativeWeb.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApiController : ControllerBase
    {
        private readonly IApiService _apiService;

        public ApiController(IApiService apiService)
        {
            _apiService = apiService;
        }

        [HttpGet("menus/primary")]
        public async Task<IActionResult> GetPrimaryMenu([FromQuery] string? langCode = null)
        {
            try
            {
                var menus = await _apiService.GetPrimaryMenuAsync();
                if (menus == null)
                {
                    return Ok(new List<object>());
                }
                return Ok(menus);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching primary menu", error = ex.Message });
            }
        }

    }
}
