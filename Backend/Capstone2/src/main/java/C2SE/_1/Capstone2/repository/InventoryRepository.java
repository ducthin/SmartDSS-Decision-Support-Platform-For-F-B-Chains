package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    /**
     * Dùng cho AI prediction / báo cáo: nạp ingredient trong cùng query, tránh LazyInitializationException
     * khi session đã đóng sau {@link #findAll()}.
     */
    @Query("SELECT DISTINCT i FROM Inventory i JOIN FETCH i.ingredient")
    List<Inventory> findAllWithIngredient();

     Optional<Inventory> findByIngredientId(Long ingredientId);

     @Lock(LockModeType.PESSIMISTIC_WRITE)
     @Query("SELECT i FROM Inventory i WHERE i.id = :id")
     Optional<Inventory> findByIdForUpdate(@Param("id") Long id);

     @Lock(LockModeType.PESSIMISTIC_WRITE)
     @Query("SELECT i FROM Inventory i WHERE i.ingredient.id = :ingredientId")
     Optional<Inventory> findByIngredientIdForUpdate(@Param("ingredientId") Long ingredientId);

     @Query("SELECT i FROM Inventory i WHERE i.quantity <= i.minimumStock")
     List<Inventory> findLowStock();

     @Query("SELECT i FROM Inventory i WHERE "
               + "(:keyword IS NULL OR LOWER(i.ingredient.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
               + "AND (:lowStock IS NULL OR (:lowStock = true AND i.quantity <= i.minimumStock))")
     Page<Inventory> search(@Param("keyword") String keyword,
               @Param("lowStock") Boolean lowStock,
               Pageable pageable);
}
