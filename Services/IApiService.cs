namespace CreativeWeb.Services
{
    public interface IApiService
    {
        Task<string?> GetRawAsync(string endpoint);
        Task<T?> GetAsync<T>(string endpoint);
        Task<T?> PostAsync<T>(string endpoint, object data);
        Task<Dictionary<string, string>?> GetSettingsAsync();
        Task<List<LanguageDto>?> GetLanguagesAsync();
        Task<List<MenuDto>?> GetPrimaryMenuAsync();
    }
    
    public class MenuDto
    {
        public string Id { get; set; } = "";
        public string? ParentId { get; set; }
        public string? RootMenuId { get; set; }
        public string? RootMenuName { get; set; }
        public string? Icon { get; set; }
        public string? LinkTarget { get; set; }
        public string? LinkType { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public bool IsHomePage { get; set; }
        public bool ShowSinglePost { get; set; }
        public string? SinglePostId { get; set; }
        public bool UseLink { get; set; }
        public List<SinglePostTranslationDto>? SinglePostTranslations { get; set; }
        public List<MenuTranslationDto> Translations { get; set; } = new();
    }
    
    public class SinglePostTranslationDto
    {
        public string? LanguageCode { get; set; }
        public string? UrlSlug { get; set; }
    }
    
    public class MenuTranslationDto
    {
        public string Id { get; set; } = "";
        public string? LanguageCode { get; set; }
        public string? Title { get; set; }
        public string? UrlSlug { get; set; }
    }
    
    public class LanguageDto
    {
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public string? FlagIcon { get; set; }
    }
}

