package C2SE._1.Capstone2.service.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InvoicePdfServiceImplTest {

    private final InvoicePdfServiceImpl invoicePdfService = new InvoicePdfServiceImpl();

    @Test
    void generatePdfAcceptsHtml5DoctypeAndVietnameseText() {
        String html = """
                <!doctype html>
                <html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
                <head>
                  <meta charset="UTF-8" />
                  <title>Hóa đơn</title>
                </head>
                <body>
                  <h1>HÓA ĐƠN GTGT</h1>
                  <p>Tạm tính đã bao gồm thuế</p>
                </body>
                </html>
                """;

        byte[] pdf = invoicePdfService.generatePdf(html);

        assertThat(pdf).startsWith("%PDF".getBytes());
        assertThat(pdf.length).isGreaterThan(1000);
    }
}
