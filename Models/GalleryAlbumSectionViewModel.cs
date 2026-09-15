namespace CreativeWeb.Models
{
    public class GalleryAlbumSectionViewModel
    {
        public string SectionId { get; set; } = "galleryImageSection";
        public string GridId { get; set; } = "galleryImageAlbums";
        public string PaginationId { get; set; } = "galleryImagePagination";
        public string SectionLabel { get; set; } = "BỘ SƯU TẬP ẢNH";
        public string PaginationAriaLabel { get; set; } = "Phân trang album hình ảnh";
        public string MediaType { get; set; } = "image";
        public bool IsRelated { get; set; }
    }
}
