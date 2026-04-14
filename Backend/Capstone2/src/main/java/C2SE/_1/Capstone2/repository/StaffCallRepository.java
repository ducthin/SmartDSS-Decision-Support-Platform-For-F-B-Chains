package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.StaffCall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaffCallRepository extends JpaRepository<StaffCall, Long> {
    Optional<StaffCall> findTopByTableNameOrderByCreatedAtDesc(String tableName);
}

