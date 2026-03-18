package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.CustomerFeedback;
import C2SE._1.Capstone2.entity.FeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long> {
    Page<CustomerFeedback> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(FeedbackStatus status);

    long countByRatingLessThanEqual(Integer rating);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByCustomerPhoneAndCreatedAtAfter(String customerPhone, LocalDateTime afterTime);

    long countByTableNameAndCreatedAtAfter(String tableName, LocalDateTime afterTime);

    boolean existsByTableNameAndCustomerPhoneAndCreatedAtAfter(String tableName, String customerPhone, LocalDateTime afterTime);

    @Query("""
            select count(f) from CustomerFeedback f
            where f.tableName = :tableName
              and f.rating <= :maxRating
              and f.createdAt >= :afterTime
            """)
    long countLowRatingByTableInWindow(
            @Param("tableName") String tableName,
            @Param("maxRating") Integer maxRating,
            @Param("afterTime") LocalDateTime afterTime
    );

    @Query("select coalesce(avg(f.rating), 0) from CustomerFeedback f")
    Double averageRating();

    @Query("""
            select f from CustomerFeedback f
            where (:status is null or f.status = :status)
              and (:rating is null or f.rating = :rating)
              and (:keyword is null or lower(f.customerName) like lower(concat('%', :keyword, '%'))
                   or lower(f.content) like lower(concat('%', :keyword, '%'))
                   or lower(f.tableName) like lower(concat('%', :keyword, '%')))
              and (:fromDate is null or f.createdAt >= :fromDate)
              and (:toDate is null or f.createdAt <= :toDate)
            """)
    Page<CustomerFeedback> search(
            @Param("status") FeedbackStatus status,
            @Param("rating") Integer rating,
            @Param("keyword") String keyword,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
}
