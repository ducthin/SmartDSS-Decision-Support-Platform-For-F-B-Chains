package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.CustomerLoyaltyAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface CustomerLoyaltyAccountRepository extends JpaRepository<CustomerLoyaltyAccount, Long> {

    List<CustomerLoyaltyAccount> findByTotalOrdersGreaterThan(int totalOrders, Sort sort);

    Optional<CustomerLoyaltyAccount> findByPhone(String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CustomerLoyaltyAccount c WHERE c.phone = :phone")
    Optional<CustomerLoyaltyAccount> findByPhoneForUpdate(@Param("phone") String phone);
}
