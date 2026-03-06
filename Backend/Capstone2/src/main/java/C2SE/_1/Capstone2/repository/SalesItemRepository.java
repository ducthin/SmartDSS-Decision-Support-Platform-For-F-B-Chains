package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.SalesItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SalesItemRepository extends JpaRepository<SalesItem, Long> {

    List<SalesItem> findBySalesTransactionId(Long salesTransactionId);

    @Query("SELECT si.menuItem.id, si.menuItem.name, SUM(si.quantity) as totalQty " +
           "FROM SalesItem si " +
           "WHERE si.salesTransaction.createdAt BETWEEN :start AND :end " +
           "GROUP BY si.menuItem.id, si.menuItem.name " +
           "ORDER BY totalQty DESC")
    List<Object[]> findBestSellingProducts(@Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);
}
