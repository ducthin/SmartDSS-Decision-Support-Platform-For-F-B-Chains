package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.QrInvoiceResponseDTO;
import C2SE._1.Capstone2.entity.InvoiceRequest;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.InvoiceRequestRepository;
import C2SE._1.Capstone2.service.InvoicePdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/invoice-requests")
@RequiredArgsConstructor
public class InvoiceRequestController {

    private final InvoiceRequestRepository invoiceRequestRepository;
    private final InvoicePdfService invoicePdfService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<QrInvoiceResponseDTO>>> getInvoiceRequests(
            @RequestParam(defaultValue = "50") int size
    ) {
        var pageable = PageRequest.of(0, Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending());
        List<QrInvoiceResponseDTO> rows = invoiceRequestRepository.findAll(pageable).getContent()
                .stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(rows));
    }

    @GetMapping("/{id}/pdf")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable Long id) {
        InvoiceRequest request = invoiceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InvoiceRequest", "id", id));
        byte[] pdf = invoicePdfService.generatePdf(request.getInvoiceHtml());
        String filename = "hoa-don-don-" + request.getOrder().getId() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private QrInvoiceResponseDTO toDTO(InvoiceRequest request) {
        return QrInvoiceResponseDTO.builder()
                .requestId(request.getId())
                .orderId(request.getOrder().getId())
                .deliveryMethod(request.getDeliveryMethod().name())
                .status(request.getStatus().name())
                .companyName(request.getCompanyName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .message("")
                .invoiceHtml(request.getInvoiceHtml())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
