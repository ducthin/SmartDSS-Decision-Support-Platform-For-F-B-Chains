package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.CustomerLoyaltyAccountDTO;
import C2SE._1.Capstone2.dto.LoyaltyTierDTO;
import C2SE._1.Capstone2.dto.LoyaltyTierPolicyDTO;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerLoyaltyAccountService {

    List<CustomerLoyaltyAccountDTO> getAllAccounts();

    CustomerLoyaltyAccountDTO getAccountByPhone(String phone);

    List<LoyaltyTierDTO> getTiers();

    List<LoyaltyTierDTO> updateTiers(List<LoyaltyTierDTO> tiers);

    LoyaltyTierPolicyDTO getTierPolicy();

    LoyaltyTierPolicyDTO updateTierPolicy(LoyaltyTierPolicyDTO dto);

    int awardPointsForOrder(String phone, BigDecimal orderAmount);
}
