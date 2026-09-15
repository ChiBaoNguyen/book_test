using CreativeWeb.Services;

namespace CreativeWeb.Helpers
{
    public static class MenuPageHelper
    {
        public static string? GetMenuTitle(MenuDto menu, string langCode)
        {
            if (menu.Translations == null || menu.Translations.Count == 0)
                return null;

            var lang = (langCode ?? "vi").Trim().ToLower();
            var translation = menu.Translations.FirstOrDefault(t =>
                string.Equals(t.LanguageCode?.Trim(), lang, StringComparison.OrdinalIgnoreCase));

            if (translation == null && lang.Length >= 2)
            {
                translation = menu.Translations.FirstOrDefault(t =>
                {
                    var tLang = (t.LanguageCode ?? "").Trim().ToLower();
                    return tLang.Length >= 2 && tLang.Substring(0, 2) == lang.Substring(0, 2);
                });
            }

            return translation?.Title ?? menu.Translations.FirstOrDefault()?.Title;
        }

        public static MenuDto? FindMenuBySlug(List<MenuDto> menus, string slug)
        {
            var menuMap = new Dictionary<string, MenuDto>();
            var rootMenus = new List<MenuDto>();

            foreach (var menu in menus)
            {
                menuMap[menu.Id] = menu;
            }

            foreach (var menu in menus)
            {
                if (string.IsNullOrWhiteSpace(menu.ParentId) || !menuMap.ContainsKey(menu.ParentId))
                {
                    rootMenus.Add(menu);
                }
            }

            return FindMenuBySlugRecursive(rootMenus, menuMap, slug);
        }

        private static MenuDto? FindMenuBySlugRecursive(List<MenuDto> menus, Dictionary<string, MenuDto> menuMap, string slug)
        {
            foreach (var menu in menus)
            {
                if (menu.Translations != null)
                {
                    foreach (var trans in menu.Translations)
                    {
                        if (!string.IsNullOrWhiteSpace(trans.UrlSlug) &&
                            trans.UrlSlug.Equals(slug, StringComparison.OrdinalIgnoreCase))
                        {
                            return menu;
                        }
                    }
                }

                var children = menuMap.Values.Where(m => m.ParentId == menu.Id).ToList();
                if (children.Count > 0)
                {
                    var found = FindMenuBySlugRecursive(children, menuMap, slug);
                    if (found != null) return found;
                }
            }

            return null;
        }
    }
}
