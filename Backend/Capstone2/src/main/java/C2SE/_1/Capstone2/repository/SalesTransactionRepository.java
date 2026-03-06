package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.SalesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, Long> {

    Optional<SalesTransaction> findByOrderId(Long orderId);

    List<SalesTransaction> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT st FROM SalesTransaction st WHERE st.cashier.id = :cashierId")
    List<SalesTransaction> findByCashierId(@Param("cashierId") Long cashierId);
}
