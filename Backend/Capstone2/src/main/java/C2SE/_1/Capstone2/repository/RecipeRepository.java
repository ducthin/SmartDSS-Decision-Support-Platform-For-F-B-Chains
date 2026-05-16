package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    List<Recipe> findByMenuItemId(Long menuItemId);

    @Query("SELECT r FROM Recipe r JOIN FETCH r.ingredient JOIN FETCH r.menuItem WHERE r.menuItem.id IN :menuItemIds")
    List<Recipe> findByMenuItemIdIn(@Param("menuItemIds") Collection<Long> menuItemIds);

    @Query("SELECT r FROM Recipe r JOIN FETCH r.menuItem WHERE r.ingredient.id = :ingredientId")
    List<Recipe> findByIngredientId(@Param("ingredientId") Long ingredientId);

    boolean existsByMenuItemIdAndIngredientId(Long menuItemId, Long ingredientId);

    /** Lấy danh sách menuItem.id dùng nguyên liệu này (để bulk-update available) */
    @Query("SELECT DISTINCT r.menuItem.id FROM Recipe r WHERE r.ingredient.id = :ingredientId")
    List<Long> findMenuItemIdsByIngredientId(@Param("ingredientId") Long ingredientId);

    /**
     * Kiểm tra xem menuItem có đủ tất cả nguyên liệu (tồn kho > 0) không.
     * Trả về số nguyên liệu còn thiếu hàng (quantity <= 0).
     * Nếu = 0 thì món đủ điều kiện mở lại.
     */
    @Query("""
        SELECT COUNT(r) FROM Recipe r
        JOIN Inventory inv ON inv.ingredient.id = r.ingredient.id
        WHERE r.menuItem.id = :menuItemId
          AND inv.quantity <= 0
        """)
    long countInsufficientIngredients(@Param("menuItemId") Long menuItemId);
}
