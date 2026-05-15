package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.service.InvoicePdfService;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;

@Service
public class InvoicePdfServiceImpl implements InvoicePdfService {

    @Override
    public byte[] generatePdf(String invoiceHtml) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            registerVietnameseFont(builder);
            builder.withHtmlContent(normalizeHtml(invoiceHtml), null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Không tạo được file PDF hóa đơn", ex);
        }
    }

    private void registerVietnameseFont(PdfRendererBuilder builder) {
        // Cách 1: Ưu tiên load font nhúng sẵn trong thư mục resources/fonts/ của project (Best Practice)
        try {
            java.io.InputStream is = getClass().getResourceAsStream("/fonts/Roboto-Regular.ttf");
            if (is != null) {
                File tempFont = File.createTempFile("Roboto-Regular", ".ttf");
                tempFont.deleteOnExit();
                java.nio.file.Files.copy(is, tempFont.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                builder.useFont(tempFont, "Arial");
                return;
            }
        } catch (Exception e) {
            // Bỏ qua và dùng fallback bên dưới
        }

        // Cách 2: Fallback tìm font trên hệ điều hành
        for (String path : new String[] {
                "C:/Windows/Fonts/arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", // Debian/Ubuntu
                "/System/Library/Fonts/Supplemental/Arial.ttf" // macOS
        }) {
            File font = new File(path);
            if (font.exists()) {
                builder.useFont(font, "Arial");
                return;
            }
        }
    }

    private String normalizeHtml(String invoiceHtml) {
        String html = invoiceHtml == null ? "" : invoiceHtml.strip();
        if (html.startsWith("\uFEFF")) {
            html = html.substring(1).strip();
        }
        if (html.regionMatches(true, 0, "<!doctype html>", 0, "<!doctype html>".length())) {
            html = "<!DOCTYPE html>" + html.substring("<!doctype html>".length());
        }
        return html;
    }
}
