package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.TransactionType;
import C2SE._1.Capstone2.entity.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    List<InventoryTransaction> findByInventoryId(Long inventoryId);

    List<InventoryTransaction> findByTypeAndCreatedAtBetween(TransactionType type, LocalDateTime start, LocalDateTime end);

    Page<InventoryTransaction> findByInventoryIdOrderByCreatedAtDesc(Long inventoryId, Pageable pageable);
}
