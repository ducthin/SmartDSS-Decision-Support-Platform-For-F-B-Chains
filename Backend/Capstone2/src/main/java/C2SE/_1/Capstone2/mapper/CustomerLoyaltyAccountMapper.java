package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.CustomerLoyaltyAccountDTO;
import C2SE._1.Capstone2.entity.CustomerLoyaltyAccount;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CustomerLoyaltyAccountMapper {

    CustomerLoyaltyAccountDTO toDTO(CustomerLoyaltyAccount account);

    List<CustomerLoyaltyAccountDTO> toDTOList(List<CustomerLoyaltyAccount> accounts);
}
