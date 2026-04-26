package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.ShiftAssignment;
import C2SE._1.Capstone2.entity.ShiftAssignmentStatus;
import C2SE._1.Capstone2.entity.ShiftType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {

    @Override
    @EntityGraph(attributePaths = {"user", "shiftTemplate"})
    Optional<ShiftAssignment> findById(Long id);

    @EntityGraph(attributePaths = {"user", "shiftTemplate"})
    List<ShiftAssignment> findByShiftDateBetweenOrderByShiftDateAsc(LocalDate fromDate, LocalDate toDate);

    @EntityGraph(attributePaths = {"user", "shiftTemplate"})
    List<ShiftAssignment> findByShiftTemplateShiftTypeAndShiftDateBetweenOrderByShiftDateAsc(ShiftType shiftType, LocalDate fromDate, LocalDate toDate);

    @EntityGraph(attributePaths = {"user", "shiftTemplate"})
    List<ShiftAssignment> findByUserIdAndShiftDateBetweenOrderByShiftDateAsc(Long userId, LocalDate fromDate, LocalDate toDate);

    @EntityGraph(attributePaths = {"user", "shiftTemplate"})
    List<ShiftAssignment> findByUserIdAndShiftTemplateShiftTypeAndShiftDateBetweenOrderByShiftDateAsc(Long userId, ShiftType shiftType, LocalDate fromDate, LocalDate toDate);

    @EntityGraph(attributePaths = {"user", "shiftTemplate"})
    List<ShiftAssignment> findByUserIdAndShiftDateAndStatusIn(Long userId, LocalDate shiftDate, List<ShiftAssignmentStatus> statuses);
}
