package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByCategoryId(Long categoryId);

    List<MenuItem> findByAvailableTrue();
}
