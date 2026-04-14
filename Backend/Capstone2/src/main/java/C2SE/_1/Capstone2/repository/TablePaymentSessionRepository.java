package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.TablePaymentSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TablePaymentSessionRepository extends JpaRepository<TablePaymentSession, Long> {

    Optional<TablePaymentSession> findBySessionKey(String sessionKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TablePaymentSession s WHERE s.sessionKey = :sessionKey")
    Optional<TablePaymentSession> findBySessionKeyForUpdate(@Param("sessionKey") String sessionKey);
}
