package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.ShiftAssignmentCreateDTO;
import C2SE._1.Capstone2.dto.ShiftAssignmentDTO;
import C2SE._1.Capstone2.dto.ShiftAssignmentUpdateDTO;
import C2SE._1.Capstone2.dto.ShiftAttendanceDTO;
import C2SE._1.Capstone2.dto.ShiftBulkAssignDTO;
import C2SE._1.Capstone2.dto.ShiftCheckInDTO;
import C2SE._1.Capstone2.dto.ShiftCheckOutDTO;
import C2SE._1.Capstone2.dto.ShiftRevenueDetailDTO;
import C2SE._1.Capstone2.dto.ShiftTemplateDTO;
import C2SE._1.Capstone2.dto.ShiftWorkSummaryDTO;
import C2SE._1.Capstone2.entity.ShiftType;

import java.time.LocalDate;
import java.util.List;

public interface ShiftService {

    List<ShiftTemplateDTO> getShiftTemplates(boolean activeOnly, ShiftType shiftType);

    ShiftTemplateDTO createShiftTemplate(ShiftTemplateDTO dto);

    ShiftTemplateDTO updateShiftTemplate(Long id, ShiftTemplateDTO dto);

    void deactivateShiftTemplate(Long id);

    List<ShiftAssignmentDTO> getAssignments(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType);

    List<ShiftAssignmentDTO> getMyAssignments(LocalDate fromDate, LocalDate toDate);

    ShiftAssignmentDTO createAssignment(ShiftAssignmentCreateDTO dto);

    List<ShiftAssignmentDTO> createAssignmentsBulk(ShiftBulkAssignDTO dto);

    ShiftAssignmentDTO updateAssignment(Long id, ShiftAssignmentUpdateDTO dto);

    ShiftAssignmentDTO cancelAssignment(Long id);

    ShiftAttendanceDTO checkIn(ShiftCheckInDTO dto);

    ShiftAttendanceDTO checkOut(ShiftCheckOutDTO dto);

    List<ShiftAttendanceDTO> getAttendances(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType);

    List<ShiftAttendanceDTO> getMyAttendances(LocalDate fromDate, LocalDate toDate);

    List<ShiftWorkSummaryDTO> getWorkSummary(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType);

    List<ShiftRevenueDetailDTO> getRevenueDetails(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType);
}
