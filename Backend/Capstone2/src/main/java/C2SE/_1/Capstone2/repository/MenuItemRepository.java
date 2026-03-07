package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.MenuItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByCategoryId(Long categoryId);

    List<MenuItem> findByAvailableTrue();

    @Query("SELECT m FROM MenuItem m WHERE "
         + "(:keyword IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
         + "AND (:categoryId IS NULL OR m.category.id = :categoryId) "
         + "AND (:available IS NULL OR m.available = :available)")
    Page<MenuItem> search(@Param("keyword") String keyword,
                          @Param("categoryId") Long categoryId,
                          @Param("available") Boolean available,
                          Pageable pageable);
}
