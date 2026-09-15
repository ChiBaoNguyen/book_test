namespace CreativeWeb.Models
{
    public class GalleryMediaViewerViewModel
    {
        public string GridId { get; set; } = "galleryDetailImages";
        public string PaginationId { get; set; } = "galleryDetailImagesPagination";
        public string PanelKey { get; set; } = "image";
        public string GridClass { get; set; } = "gallery-media-grid";
        public string PaginationAriaLabel { get; set; } = "Phân trang hình ảnh";
        public bool WrapInPanel { get; set; } = true;
        public bool IsActive { get; set; } = true;
    }
}
