package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Inventory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByIngredientId(Long ingredientId);

    @Query("SELECT i FROM Inventory i WHERE i.quantity <= i.minimumStock")
    List<Inventory> findLowStock();

    @Query("SELECT i FROM Inventory i WHERE "
         + "(:keyword IS NULL OR LOWER(i.ingredient.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
         + "AND (:lowStock IS NULL OR (:lowStock = true AND i.quantity <= i.minimumStock))")
    Page<Inventory> search(@Param("keyword") String keyword,
                           @Param("lowStock") Boolean lowStock,
                           Pageable pageable);
}
