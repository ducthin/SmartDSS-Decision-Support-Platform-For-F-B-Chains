package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.BookingStatus;
import C2SE._1.Capstone2.entity.TableBooking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface TableBookingRepository extends JpaRepository<TableBooking, Long> {

    @Query("""
            SELECT b
            FROM TableBooking b
            WHERE (:status IS NULL OR b.status = :status)
              AND (:keyword IS NULL OR
                   LOWER(b.customerName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   b.customerPhone LIKE CONCAT('%', :keyword, '%'))
              AND (:fromDate IS NULL OR b.bookingDate >= :fromDate)
              AND (:toDate IS NULL OR b.bookingDate <= :toDate)
            """)
    Page<TableBooking> search(
            @Param("status") BookingStatus status,
            @Param("keyword") String keyword,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable
    );
}
