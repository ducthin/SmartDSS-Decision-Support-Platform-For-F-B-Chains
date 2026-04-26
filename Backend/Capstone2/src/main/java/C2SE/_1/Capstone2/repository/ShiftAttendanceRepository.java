package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.ShiftAttendance;
import C2SE._1.Capstone2.entity.ShiftType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftAttendanceRepository extends JpaRepository<ShiftAttendance, Long> {

    @EntityGraph(attributePaths = {"assignment", "assignment.user", "assignment.shiftTemplate"})
    Optional<ShiftAttendance> findByAssignmentId(Long assignmentId);

    @EntityGraph(attributePaths = {"assignment", "assignment.user", "assignment.shiftTemplate"})
    List<ShiftAttendance> findByAssignmentIdIn(List<Long> assignmentIds);

    @EntityGraph(attributePaths = {"assignment", "assignment.user", "assignment.shiftTemplate"})
    @Query("""
            SELECT sa FROM ShiftAttendance sa
            WHERE sa.assignment.shiftDate BETWEEN :fromDate AND :toDate
            ORDER BY sa.assignment.shiftDate ASC, sa.checkInAt ASC
            """)
    List<ShiftAttendance> findByShiftDateRange(@Param("fromDate") LocalDate fromDate,
                                               @Param("toDate") LocalDate toDate);

    @EntityGraph(attributePaths = {"assignment", "assignment.user", "assignment.shiftTemplate"})
    @Query("""
            SELECT sa FROM ShiftAttendance sa
            WHERE sa.assignment.shiftTemplate.shiftType = :shiftType
            AND sa.assignment.shiftDate BETWEEN :fromDate AND :toDate
            ORDER BY sa.assignment.shiftDate ASC, sa.checkInAt ASC
            """)
    List<ShiftAttendance> findByShiftTypeAndShiftDateRange(@Param("shiftType") ShiftType shiftType,
                                                           @Param("fromDate") LocalDate fromDate,
                                                           @Param("toDate") LocalDate toDate);

    @EntityGraph(attributePaths = {"assignment", "assignment.user", "assignment.shiftTemplate"})
    @Query("""
            SELECT sa FROM ShiftAttendance sa
            WHERE sa.assignment.user.id = :userId
            AND sa.assignment.shiftDate BETWEEN :fromDate AND :toDate
            ORDER BY sa.assignment.shiftDate ASC, sa.checkInAt ASC
            """)
    List<ShiftAttendance> findByUserAndShiftDateRange(@Param("userId") Long userId,
                                                      @Param("fromDate") LocalDate fromDate,
                                                      @Param("toDate") LocalDate toDate);

    @EntityGraph(attributePaths = {"assignment", "assignment.user", "assignment.shiftTemplate"})
    @Query("""
            SELECT sa FROM ShiftAttendance sa
            WHERE sa.assignment.user.id = :userId
            AND sa.assignment.shiftTemplate.shiftType = :shiftType
            AND sa.assignment.shiftDate BETWEEN :fromDate AND :toDate
            ORDER BY sa.assignment.shiftDate ASC, sa.checkInAt ASC
            """)
    List<ShiftAttendance> findByUserAndShiftTypeAndShiftDateRange(@Param("userId") Long userId,
                                                                 @Param("shiftType") ShiftType shiftType,
                                                                 @Param("fromDate") LocalDate fromDate,
                                                                 @Param("toDate") LocalDate toDate);
}
