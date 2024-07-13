using System.Web.Mvc;

namespace PdfViewer.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult PdfWithBytes()
        {
            return View();
        }

        public ActionResult GetPdf()
        {
            string pdfPath = Server.MapPath("~/Content/report.pdf");
            byte[] pdfBytes = System.IO.File.ReadAllBytes(pdfPath);
            return File(pdfBytes, "application/pdf");
        }
    }
}