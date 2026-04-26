package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Voucher;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeIgnoreCase(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Voucher v WHERE UPPER(v.code) = UPPER(:code)")
    Optional<Voucher> findByCodeForUpdate(@Param("code") String code);

    @Query("""
            SELECT v FROM Voucher v
            WHERE v.customerPhone = :phone
            AND v.active = true
            AND (v.validFrom IS NULL OR v.validFrom <= :now)
            AND (v.validTo IS NULL OR v.validTo >= :now)
            AND (v.usageLimit IS NULL OR v.usedCount < v.usageLimit)
            ORDER BY v.validTo ASC, v.createdAt DESC
            """)
    List<Voucher> findAvailablePersonalVouchers(@Param("phone") String phone, @Param("now") LocalDateTime now);

    @Query("""
            SELECT v FROM Voucher v
            WHERE (:keyword IS NULL
                OR LOWER(v.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(v.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Voucher> search(@Param("keyword") String keyword, Pageable pageable);
}
