package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.ShiftTemplate;
import C2SE._1.Capstone2.entity.ShiftType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {

    List<ShiftTemplate> findAllByOrderByStartTimeAsc();

    List<ShiftTemplate> findByActiveTrueOrderByStartTimeAsc();

    List<ShiftTemplate> findByShiftTypeOrderByStartTimeAsc(ShiftType shiftType);

    List<ShiftTemplate> findByActiveTrueAndShiftTypeOrderByStartTimeAsc(ShiftType shiftType);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
