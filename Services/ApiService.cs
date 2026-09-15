using System.Text;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace CreativeWeb.Services
{
    public class ApiService : IApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public ApiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;

            var apiBaseUrl = _configuration["ApiSettings:BaseUrl"] ?? "http://localhost:5001";
            _httpClient.BaseAddress = new Uri(apiBaseUrl);
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

            var token = GenerateJwtToken();
            if (!string.IsNullOrEmpty(token))
            {
                _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }
        }

        private string? GenerateJwtToken()
        {
            try
            {
                var websiteKey = _configuration["ApiSettings:ApiKey"];
                var issuer = _configuration["ApiSettings:Issuer"] ?? "CreativeAPI";
                var audience = _configuration["ApiSettings:Audience"] ?? "FileServer";

                if (string.IsNullOrEmpty(websiteKey))
                {
                    return null;
                }

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(websiteKey));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var claims = new[]
                {
                    new Claim(ClaimTypes.Role, "CreativeWeb"),
                    new Claim(ClaimTypes.NameIdentifier, "Website"),
                    new Claim(ClaimTypes.Name, "CreativeWeb")
                };

                var token = new JwtSecurityToken(
                    issuer: issuer,
                    audience: audience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddHours(24),
                    signingCredentials: creds
                );

                return new JwtSecurityTokenHandler().WriteToken(token);
            }
            catch
            {
                return null;
            }
        }

        public async Task<string?> GetRawAsync(string endpoint)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return content;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        public async Task<T?> GetAsync<T>(string endpoint)
        {
            try
            {
                var response = await _httpClient.GetAsync(endpoint);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonSerializer.Deserialize<T>(content, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }
                return default(T);
            }
            catch
            {
                return default(T);
            }
        }

        public async Task<T?> PostAsync<T>(string endpoint, object data)
        {
            try
            {
                var json = JsonSerializer.Serialize(data);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(endpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonSerializer.Deserialize<T>(responseContent, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }
                return default(T);
            }
            catch
            {
                return default(T);
            }
        }

        public async Task<Dictionary<string, string>?> GetSettingsAsync()
        {
            try
            {
                var settings = await GetAsync<List<SettingDto>>("/api/Portal/settings");
                if (settings != null)
                {
                    return settings.ToDictionary(s => s.Code, s => s.Value ?? "");
                }
                return null;
            }
            catch
            {
                return null;
            }
        }

        public async Task<List<LanguageDto>?> GetLanguagesAsync()
        {
            try
            {
                return await GetAsync<List<LanguageDto>>("/api/Portal/languages");
            }
            catch
            {
                return null;
            }
        }

        public async Task<List<MenuDto>?> GetPrimaryMenuAsync()
        {
            try
            {
                return await GetAsync<List<MenuDto>>("/api/Portal/menus/primary");
            }
            catch
            {
                return null;
            }
        }
    }

    public class SettingDto
    {
        public string Code { get; set; } = "";
        public string? Value { get; set; }
    }
}
