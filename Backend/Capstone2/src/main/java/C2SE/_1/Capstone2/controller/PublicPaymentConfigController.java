package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PaymentBankConfigDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/config/payments")
@RequiredArgsConstructor
public class PublicPaymentConfigController {

    @Value("${app.payment.bank.bin:970422}")
    private String bankBin;

    @Value("${app.payment.bank.account:55777777686868}")
    private String bankAccount;

    @Value("${app.payment.bank.account-name:SMARTDSS CAFE}")
    private String bankAccountName;

    @GetMapping("/bank")
    public ResponseEntity<ApiResponse<PaymentBankConfigDTO>> getPaymentBankConfig() {
        return ResponseEntity.ok(ApiResponse.success(
                PaymentBankConfigDTO.builder()
                        .bankBin(bankBin)
                        .bankAccount(bankAccount)
                        .bankAccountName(bankAccountName)
                        .build()
        ));
    }
}

