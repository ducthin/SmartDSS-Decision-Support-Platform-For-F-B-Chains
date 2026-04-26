package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    List<Order> findAll();

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    Page<Order> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    Optional<Order> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    List<Order> findByStatus(OrderStatus status);

    @Query("""
            SELECT o FROM Order o
            WHERE o.status = C2SE._1.Capstone2.entity.OrderStatus.COMPLETED
            AND o.customerPhone IS NOT NULL
            AND TRIM(o.customerPhone) <> ''
            AND o.loyaltyPointsEarned IS NULL
            """)
    List<Order> findCompletedOrdersNeedingLoyaltyBackfill();

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    @Query("""
            SELECT o FROM Order o
            WHERE o.status = :status
            AND COALESCE(o.updatedAt, o.createdAt) BETWEEN :start AND :end
            """)
    List<Order> findByStatusInBusinessRange(@Param("status") OrderStatus status,
                                            @Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    List<Order> findByCreatedById(Long userId);

    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("""
            SELECT COUNT(o) FROM Order o
            WHERE o.status = C2SE._1.Capstone2.entity.OrderStatus.COMPLETED
            AND o.customerPhone = :phone
            AND COALESCE(o.updatedAt, o.createdAt) BETWEEN :start AND :end
            """)
    long countCompletedByPhoneInRange(@Param("phone") String phone,
                                      @Param("start") LocalDateTime start,
                                      @Param("end") LocalDateTime end);

    @Query("""
            SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o
            WHERE o.status = C2SE._1.Capstone2.entity.OrderStatus.COMPLETED
            AND o.customerPhone = :phone
            AND COALESCE(o.updatedAt, o.createdAt) BETWEEN :start AND :end
            """)
    BigDecimal sumCompletedAmountByPhoneInRange(@Param("phone") String phone,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    @Query("SELECT o FROM Order o WHERE o.status <> :cancelledStatus AND o.tableNumber IS NOT NULL AND o.tableNumber <> ''")
    List<Order> findTableOrdersForSettlement(@Param("cancelledStatus") OrderStatus cancelledStatus);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    List<Order> findByTableNumberOrderByCreatedAtDesc(String tableNumber);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    List<Order> findByTableNumberAndQrClientSessionIdOrderByCreatedAtDesc(String tableNumber, String qrClientSessionId);
}
