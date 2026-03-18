package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.TaxPolicyDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/public/config")
public class PublicConfigController {

    @Value("${app.tax.vat.rate-percent:8}")
    private BigDecimal vatRatePercent;

    @Value("${app.tax.vat.price-includes-vat:true}")
    private boolean priceIncludesVat;

    @GetMapping("/tax")
    public ResponseEntity<ApiResponse<TaxPolicyDTO>> getTaxPolicy() {
        return ResponseEntity.ok(ApiResponse.success(
                TaxPolicyDTO.builder()
                        .vatRatePercent(vatRatePercent)
                        .priceIncludesVat(priceIncludesVat)
                        .build()
        ));
    }
}
