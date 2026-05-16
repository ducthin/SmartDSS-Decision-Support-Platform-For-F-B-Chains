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

    List<Recipe> findByIngredientId(Long ingredientId);

    boolean existsByMenuItemIdAndIngredientId(Long menuItemId, Long ingredientId);
}
