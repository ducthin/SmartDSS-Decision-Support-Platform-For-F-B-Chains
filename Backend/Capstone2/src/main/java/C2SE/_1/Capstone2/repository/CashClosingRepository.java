package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.CashClosing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface CashClosingRepository extends JpaRepository<CashClosing, Long> {

    Optional<CashClosing> findByBusinessDate(LocalDate businessDate);

    Optional<CashClosing> findTopByBusinessDateLessThanOrderByBusinessDateDesc(LocalDate businessDate);

    Page<CashClosing> findByBusinessDateBetweenOrderByBusinessDateDesc(LocalDate fromDate, LocalDate toDate, Pageable pageable);
}
