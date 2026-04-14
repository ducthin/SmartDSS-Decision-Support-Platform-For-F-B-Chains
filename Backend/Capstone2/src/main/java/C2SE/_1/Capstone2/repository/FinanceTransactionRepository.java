package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.FinanceTransaction;
import C2SE._1.Capstone2.entity.FinanceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FinanceTransactionRepository extends JpaRepository<FinanceTransaction, Long> {

        boolean existsBySourceTypeAndSourceRefId(String sourceType, String sourceRefId);

    @Query("""
            SELECT ft FROM FinanceTransaction ft
            WHERE (:fromDate IS NULL OR ft.occurredAt >= :fromDate)
              AND (:toDate IS NULL OR ft.occurredAt <= :toDate)
              AND (:type IS NULL OR ft.type = :type)
              AND (:categoryId IS NULL OR ft.category.id = :categoryId)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(ft.note) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(ft.category.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<FinanceTransaction> search(@Param("fromDate") LocalDateTime fromDate,
                                    @Param("toDate") LocalDateTime toDate,
                                    @Param("type") FinanceType type,
                                    @Param("categoryId") Long categoryId,
                                    @Param("keyword") String keyword,
                                    Pageable pageable);

    @Query("""
            SELECT ft FROM FinanceTransaction ft
            WHERE (:fromDate IS NULL OR ft.occurredAt >= :fromDate)
              AND (:toDate IS NULL OR ft.occurredAt <= :toDate)
            """)
    List<FinanceTransaction> findByOccurredAtRange(@Param("fromDate") LocalDateTime fromDate,
                                                   @Param("toDate") LocalDateTime toDate);
}
