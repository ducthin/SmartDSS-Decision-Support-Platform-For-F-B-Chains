package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatus(OrderStatus status);

    List<Order> findByCreatedById(Long userId);

    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
