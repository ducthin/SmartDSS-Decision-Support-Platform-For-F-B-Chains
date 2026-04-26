package C2SE._1.Capstone2.service;

public interface InvoicePdfService {
    byte[] generatePdf(String invoiceHtml);
}
