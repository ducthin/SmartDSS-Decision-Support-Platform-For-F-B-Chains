package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.CustomerLoyaltyAccountDTO;
import C2SE._1.Capstone2.dto.LoyaltyTierDTO;
import C2SE._1.Capstone2.dto.LoyaltyTierPolicyDTO;
import C2SE._1.Capstone2.service.CustomerLoyaltyAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loyalty")
@RequiredArgsConstructor
public class CustomerLoyaltyController {

    private final CustomerLoyaltyAccountService customerLoyaltyAccountService;

    @GetMapping("/accounts")
    public ResponseEntity<ApiResponse<List<CustomerLoyaltyAccountDTO>>> getAllAccounts() {
        return ResponseEntity.ok(ApiResponse.success(customerLoyaltyAccountService.getAllAccounts()));
    }

    @GetMapping("/accounts/{phone}")
    public ResponseEntity<ApiResponse<CustomerLoyaltyAccountDTO>> getAccountByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(ApiResponse.success(customerLoyaltyAccountService.getAccountByPhone(phone)));
    }

    @GetMapping("/tiers")
    public ResponseEntity<ApiResponse<List<LoyaltyTierDTO>>> getTiers() {
        return ResponseEntity.ok(ApiResponse.success(customerLoyaltyAccountService.getTiers()));
    }

    @PutMapping("/tiers")
    public ResponseEntity<ApiResponse<List<LoyaltyTierDTO>>> updateTiers(@Valid @RequestBody List<LoyaltyTierDTO> tiers) {
        return ResponseEntity.ok(ApiResponse.success(customerLoyaltyAccountService.updateTiers(tiers)));
    }

    @GetMapping("/tier-policy")
    public ResponseEntity<ApiResponse<LoyaltyTierPolicyDTO>> getTierPolicy() {
        return ResponseEntity.ok(ApiResponse.success(customerLoyaltyAccountService.getTierPolicy()));
    }

    @PutMapping("/tier-policy")
    public ResponseEntity<ApiResponse<LoyaltyTierPolicyDTO>> updateTierPolicy(@Valid @RequestBody LoyaltyTierPolicyDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(customerLoyaltyAccountService.updateTierPolicy(dto)));
    }
}
