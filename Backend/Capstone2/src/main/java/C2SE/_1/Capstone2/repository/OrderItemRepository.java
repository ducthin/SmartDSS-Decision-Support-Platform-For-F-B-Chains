package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.OrderItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    @Query("""
            SELECT oi
            FROM OrderItem oi
            JOIN FETCH oi.order o
            JOIN FETCH oi.menuItem m
            WHERE o.status = :status
              AND o.createdAt BETWEEN :start AND :end
            """)
    List<OrderItem> findRecentByOrderStatusAndCreatedAtBetween(
            @Param("status") OrderStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
            SELECT oi.menuItem.id, oi.menuItem.name, SUM(oi.quantity) AS totalQty, SUM(oi.subtotal) AS totalRev
            FROM OrderItem oi
            JOIN oi.order o
            WHERE o.status = :status
              AND o.createdAt BETWEEN :start AND :end
            GROUP BY oi.menuItem.id, oi.menuItem.name
            ORDER BY totalQty DESC, totalRev DESC
            """)
    List<Object[]> findBestSellingProductsByOrderQuantity(
            @Param("status") OrderStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    @Query("""
            SELECT oi.menuItem.id
            FROM OrderItem oi
            JOIN oi.order o
            WHERE o.status = :status
              AND o.createdAt BETWEEN :start AND :end
            GROUP BY oi.menuItem.id
            ORDER BY SUM(oi.quantity) DESC, SUM(oi.subtotal) DESC
            """)
    List<Long> findBestSellingMenuItemIdsByOrderQuantity(
            @Param("status") OrderStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );
}
