package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.CustomerLoyaltyAccountDTO;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerLoyaltyAccountService {

    List<CustomerLoyaltyAccountDTO> getAllAccounts();

    CustomerLoyaltyAccountDTO getAccountByPhone(String phone);

    int awardPointsForOrder(String phone, BigDecimal orderAmount);
}
