package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.DiningTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    Optional<DiningTable> findByQrToken(String qrToken);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);
}
