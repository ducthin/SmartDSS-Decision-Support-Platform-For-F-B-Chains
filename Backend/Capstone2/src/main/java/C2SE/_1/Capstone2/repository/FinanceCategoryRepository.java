package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.FinanceCategory;
import C2SE._1.Capstone2.entity.FinanceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FinanceCategoryRepository extends JpaRepository<FinanceCategory, Long> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Query("SELECT fc FROM FinanceCategory fc WHERE (:activeOnly = false OR fc.active = true) AND (:type IS NULL OR fc.type = :type) ORDER BY fc.type, fc.name")
    List<FinanceCategory> findForSelection(@Param("activeOnly") boolean activeOnly, @Param("type") FinanceType type);

    Optional<FinanceCategory> findByIdAndActiveTrue(Long id);

    Optional<FinanceCategory> findByNameIgnoreCase(String name);

    Optional<FinanceCategory> findFirstByTypeAndActiveTrueOrderByIdAsc(FinanceType type);
}
