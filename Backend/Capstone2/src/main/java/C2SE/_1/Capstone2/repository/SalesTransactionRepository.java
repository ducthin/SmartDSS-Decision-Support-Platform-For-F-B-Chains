package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.SalesTransaction;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, Long> {

    Optional<SalesTransaction> findByOrderId(Long orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT st FROM SalesTransaction st WHERE st.order.id = :orderId")
    Optional<SalesTransaction> findByOrderIdForUpdate(@Param("orderId") Long orderId);

    List<SalesTransaction> findByOrderIdIn(List<Long> orderIds);

       List<SalesTransaction> findByTablePaymentSessionKey(String tablePaymentSessionKey);

       @Lock(LockModeType.PESSIMISTIC_WRITE)
       @Query("SELECT st FROM SalesTransaction st WHERE st.tablePaymentSessionKey = :sessionKey")
       List<SalesTransaction> findByTablePaymentSessionKeyForUpdate(@Param("sessionKey") String sessionKey);

    List<SalesTransaction> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT st FROM SalesTransaction st WHERE st.cashier.id = :cashierId")
    List<SalesTransaction> findByCashierId(@Param("cashierId") Long cashierId);

    @Query("SELECT st FROM SalesTransaction st " +
           "WHERE st.paymentMethod IN ('CASH', 'QR') " +
           "AND COALESCE(st.paidAt, st.updatedAt, st.createdAt) BETWEEN :start AND :end")
    List<SalesTransaction> findPaidTransactionsInRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT HOUR(DATE_ADD(COALESCE(st.paid_at, st.updated_at, st.created_at), INTERVAL :tzMinutes MINUTE)) as h, COUNT(*) as cnt, COALESCE(SUM(st.total_amount), 0) as rev " +
           "FROM sales_transactions st WHERE DATE_ADD(COALESCE(st.paid_at, st.updated_at, st.created_at), INTERVAL :tzMinutes MINUTE) BETWEEN :start AND :end " +
           "AND st.payment_method IN ('CASH', 'QR') " +
           "GROUP BY HOUR(DATE_ADD(COALESCE(st.paid_at, st.updated_at, st.created_at), INTERVAL :tzMinutes MINUTE)) ORDER BY h", nativeQuery = true)
    List<Object[]> findHourlySales(@Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end,
                                   @Param("tzMinutes") int tzMinutes);

    @Query(value = "SELECT DATE(DATE_ADD(COALESCE(st.paid_at, st.updated_at, st.created_at), INTERVAL :tzMinutes MINUTE)) as d, COUNT(*) as cnt, COALESCE(SUM(st.total_amount), 0) as rev " +
           "FROM sales_transactions st WHERE DATE_ADD(COALESCE(st.paid_at, st.updated_at, st.created_at), INTERVAL :tzMinutes MINUTE) BETWEEN :start AND :end " +
           "AND st.payment_method IN ('CASH', 'QR') " +
           "GROUP BY DATE(DATE_ADD(COALESCE(st.paid_at, st.updated_at, st.created_at), INTERVAL :tzMinutes MINUTE)) ORDER BY d", nativeQuery = true)
    List<Object[]> findDailySalesGrouped(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end,
                                         @Param("tzMinutes") int tzMinutes);

    @Query(value = "SELECT DATE(st.paid_at) as d, COUNT(*) as cnt, " +
            "COALESCE(SUM(st.net_amount), 0) as net, " +
            "COALESCE(SUM(st.vat_amount), 0) as vat, " +
            "COALESCE(SUM(st.total_amount), 0) as gross " +
            "FROM sales_transactions st " +
            "WHERE st.paid_at BETWEEN :start AND :end " +
            "AND st.payment_method IN ('CASH', 'QR') " +
            "GROUP BY DATE(st.paid_at) ORDER BY d", nativeQuery = true)
    List<Object[]> findDailyTaxBreakdown(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT COUNT(*) as cnt, " +
            "COALESCE(SUM(st.net_amount), 0) as net, " +
            "COALESCE(SUM(st.vat_amount), 0) as vat, " +
            "COALESCE(SUM(st.total_amount), 0) as gross " +
            "FROM sales_transactions st " +
            "WHERE st.paid_at BETWEEN :start AND :end " +
            "AND st.payment_method IN ('CASH', 'QR')", nativeQuery = true)
    List<Object[]> findTaxSummary(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
