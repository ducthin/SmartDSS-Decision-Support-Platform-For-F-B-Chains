package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    List<Order> findByStatus(OrderStatus status);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.menuItem", "createdBy"})
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    List<Order> findByCreatedById(Long userId);

    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Order> findByTableNumberOrderByCreatedAtDesc(String tableNumber);
}
