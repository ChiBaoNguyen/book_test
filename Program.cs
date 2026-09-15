var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var mvcBuilder = builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

if (builder.Environment.IsDevelopment())
{
    mvcBuilder.AddRazorRuntimeCompilation();
}

// Register HttpClient and ApiService
builder.Services.AddHttpClient<CreativeWeb.Services.IApiService, CreativeWeb.Services.ApiService>();
builder.Services.AddHttpClient("CdnProxy", client =>
{
    client.Timeout = TimeSpan.FromMinutes(10);
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    AutomaticDecompression = System.Net.DecompressionMethods.None,
    AllowAutoRedirect = true
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

var staticFileOptions = new StaticFileOptions
{
    ContentTypeProvider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider()
};
((Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider)staticFileOptions.ContentTypeProvider)
    .Mappings[".geojson"] = "application/geo+json";
app.UseStaticFiles(staticFileOptions);

app.UseRouting();

app.UseAuthorization();

// Configure status code pages
app.UseStatusCodePagesWithReExecute("/error/{0}");

// Route for content pages (single posts) - MUST be registered first
// Any URL starting with /content/ will be handled by SinglePageController
app.MapControllerRoute(
    name: "content",
    pattern: "content/{slug}",
    defaults: new { controller = "SinglePage", action = "Index" });

// Map controllers for attribute routing (for other controllers)
app.MapControllers();

// Route for page pages (list/grid content)
app.MapControllerRoute(
    name: "page",
    pattern: "page/{slug}",
    defaults: new { controller = "Page", action = "Index" });

// Route for article by slug directly: article/{slug}
app.MapControllerRoute(
    name: "article",
    pattern: "article/{articleSlug}",
    defaults: new { controller = "Article", action = "Index" });

// Route for article pages: page/{pageslug}/article/{slug}
app.MapControllerRoute(
    name: "articleWithPage",
    pattern: "page/{pageSlug}/article/{articleSlug}",
    defaults: new { controller = "Article", action = "Index" });

// Route for event by slug directly: event/{slug}
app.MapControllerRoute(
    name: "event",
    pattern: "event/{eventSlug}",
    defaults: new { controller = "Event", action = "Index" });

// Route for event pages: page/{pageslug}/event/{slug}
app.MapControllerRoute(
    name: "eventWithPage",
    pattern: "page/{pageSlug}/event/{eventSlug}",
    defaults: new { controller = "Event", action = "Index" });

// Route for book by slug directly: book/{slug}
app.MapControllerRoute(
    name: "book",
    pattern: "book/{bookSlug}",
    defaults: new { controller = "Book", action = "Index" });

// Route for book pages: page/{pageslug}/book/{slug}
app.MapControllerRoute(
    name: "bookWithPage",
    pattern: "page/{pageSlug}/book/{bookSlug}",
    defaults: new { controller = "Book", action = "Index" });

// Route for product by slug directly: product/{slug}
app.MapControllerRoute(
    name: "product",
    pattern: "product/{productSlug}",
    defaults: new { controller = "Product", action = "Index" });

// Route for product pages: page/{pageslug}/product/{slug}
app.MapControllerRoute(
    name: "productWithPage",
    pattern: "page/{pageSlug}/product/{productSlug}",
    defaults: new { controller = "Product", action = "Index" });

// Gallery / Album routes
app.MapControllerRoute(
    name: "galleryDetail",
    pattern: "gallery/{albumCode}",
    defaults: new { controller = "Gallery", action = "Detail" });

app.MapControllerRoute(
    name: "albumDetail",
    pattern: "album/{albumCode}",
    defaults: new { controller = "Gallery", action = "Detail" });

app.MapControllerRoute(
    name: "gallery",
    pattern: "gallery",
    defaults: new { controller = "Gallery", action = "Index" });

app.MapControllerRoute(
    name: "album",
    pattern: "album",
    defaults: new { controller = "Gallery", action = "Index" });

// Events hub (calendar + notifications)
app.MapControllerRoute(
    name: "events",
    pattern: "events",
    defaults: new { controller = "Events", action = "Index" });

app.MapControllerRoute(
    name: "eventsVi",
    pattern: "su-kien",
    defaults: new { controller = "Events", action = "Index" });

// Notification detail
app.MapControllerRoute(
    name: "notification",
    pattern: "notification/{id}",
    defaults: new { controller = "Notification", action = "Index" });

// Default route
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

