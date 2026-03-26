package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.OrderStatus;
import C2SE._1.Capstone2.entity.OrderItem;
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
}
