package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.ShiftAssignmentCreateDTO;
import C2SE._1.Capstone2.dto.ShiftAssignmentDTO;
import C2SE._1.Capstone2.dto.ShiftAssignmentUpdateDTO;
import C2SE._1.Capstone2.dto.ShiftAttendanceDTO;
import C2SE._1.Capstone2.dto.ShiftBulkAssignDTO;
import C2SE._1.Capstone2.dto.ShiftCheckInDTO;
import C2SE._1.Capstone2.dto.ShiftCheckOutDTO;
import C2SE._1.Capstone2.dto.ShiftRevenueDetailDTO;
import C2SE._1.Capstone2.dto.ShiftRevenueTransactionDTO;
import C2SE._1.Capstone2.dto.ShiftTemplateDTO;
import C2SE._1.Capstone2.dto.ShiftWorkSummaryDTO;
import C2SE._1.Capstone2.entity.SalesTransaction;
import C2SE._1.Capstone2.entity.ShiftAssignment;
import C2SE._1.Capstone2.entity.ShiftAssignmentStatus;
import C2SE._1.Capstone2.entity.ShiftAttendance;
import C2SE._1.Capstone2.entity.ShiftTemplate;
import C2SE._1.Capstone2.entity.ShiftType;
import C2SE._1.Capstone2.entity.User;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.DuplicateResourceException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.SalesTransactionRepository;
import C2SE._1.Capstone2.repository.ShiftAssignmentRepository;
import C2SE._1.Capstone2.repository.ShiftAttendanceRepository;
import C2SE._1.Capstone2.repository.ShiftTemplateRepository;
import C2SE._1.Capstone2.repository.UserRepository;
import C2SE._1.Capstone2.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ShiftServiceImpl implements ShiftService {

    private static final String DEFAULT_CHECK_SOURCE = "WEB";
    private static final List<ShiftAssignmentStatus> OVERLAP_BLOCK_STATUSES = List.of(
            ShiftAssignmentStatus.ASSIGNED,
            ShiftAssignmentStatus.CHECKED_IN,
            ShiftAssignmentStatus.COMPLETED
    );

    private final ShiftTemplateRepository shiftTemplateRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftAttendanceRepository shiftAttendanceRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final UserRepository userRepository;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTimezone;

    @Override
    @Transactional(readOnly = true)
    public List<ShiftTemplateDTO> getShiftTemplates(boolean activeOnly, ShiftType shiftType) {
        List<ShiftTemplate> templates = activeOnly
                ? shiftTemplateRepository.findByActiveTrueOrderByStartTimeAsc()
                : shiftTemplateRepository.findAllByOrderByStartTimeAsc();
        return templates.stream().map(this::toTemplateDTO).toList();
    }

    @Override
    public ShiftTemplateDTO createShiftTemplate(ShiftTemplateDTO dto) {
        validateTemplate(dto);
        String normalizedName = normalizeName(dto.getName());
        if (shiftTemplateRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new DuplicateResourceException("Tên ca đã tồn tại: " + normalizedName);
        }

        ShiftTemplate template = ShiftTemplate.builder()
                .name(normalizedName)
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .breakMinutes(dto.getBreakMinutes() == null ? 0 : dto.getBreakMinutes())
                .shiftType(resolveShiftType(dto.getShiftType()))
                .active(dto.getActive() == null ? true : dto.getActive())
                .build();

        return toTemplateDTO(shiftTemplateRepository.save(template));
    }

    @Override
    public ShiftTemplateDTO updateShiftTemplate(Long id, ShiftTemplateDTO dto) {
        ShiftTemplate template = shiftTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftTemplate", "id", id));

        validateTemplate(dto);
        String normalizedName = normalizeName(dto.getName());
        if (shiftTemplateRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            throw new DuplicateResourceException("Tên ca đã tồn tại: " + normalizedName);
        }

        template.setName(normalizedName);
        template.setStartTime(dto.getStartTime());
        template.setEndTime(dto.getEndTime());
        template.setBreakMinutes(dto.getBreakMinutes() == null ? 0 : dto.getBreakMinutes());
        template.setShiftType(resolveShiftType(dto.getShiftType()));
        if (dto.getActive() != null) {
            template.setActive(dto.getActive());
        }

        return toTemplateDTO(shiftTemplateRepository.save(template));
    }

    @Override
    public void deactivateShiftTemplate(Long id) {
        ShiftTemplate template = shiftTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftTemplate", "id", id));
        template.setActive(false);
        shiftTemplateRepository.save(template);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftAssignmentDTO> getAssignments(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType) {
        DateRange range = normalizeRange(fromDate, toDate);
        List<ShiftAssignment> assignments = userId == null
                ? shiftAssignmentRepository.findByShiftDateBetweenOrderByShiftDateAsc(range.fromDate(), range.toDate())
                : shiftAssignmentRepository.findByUserIdAndShiftDateBetweenOrderByShiftDateAsc(userId, range.fromDate(), range.toDate());
        if (shiftType != null) {
            assignments = assignments.stream()
                    .filter(assignment -> resolveAssignmentShiftType(assignment) == shiftType)
                    .toList();
        }

        return mapAssignments(assignments);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftAssignmentDTO> getMyAssignments(LocalDate fromDate, LocalDate toDate) {
        User currentUser = getCurrentUser();
        DateRange range = normalizeRange(fromDate, toDate);
        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByUserIdAndShiftDateBetweenOrderByShiftDateAsc(
                currentUser.getId(),
                range.fromDate(),
                range.toDate()
        );
        return mapAssignments(assignments);
    }

    @Override
    public ShiftAssignmentDTO createAssignment(ShiftAssignmentCreateDTO dto) {
        User user = getUserForAssignment(dto.getUserId());
        ShiftTemplate template = getTemplateForAssignment(dto.getShiftTemplateId());

        ensureNoOverlap(user.getId(), dto.getShiftDate(), template, null);

        ShiftAssignment assignment = ShiftAssignment.builder()
                .user(user)
                .shiftTemplate(template)
                .shiftDate(dto.getShiftDate())
                .shiftType(resolveShiftType(dto.getShiftType()))
                .status(ShiftAssignmentStatus.ASSIGNED)
                .note(normalizeNote(dto.getNote()))
                .build();

        ShiftAssignment saved = shiftAssignmentRepository.save(assignment);
        return mapAssignments(List.of(saved)).get(0);
    }

    @Override
    public List<ShiftAssignmentDTO> createAssignmentsBulk(ShiftBulkAssignDTO dto) {
        ShiftTemplate template = getTemplateForAssignment(dto.getShiftTemplateId());

        Set<Long> userIds = new LinkedHashSet<>(dto.getUserIds());
        Set<LocalDate> shiftDates = new LinkedHashSet<>(dto.getShiftDates());
        ShiftType assignmentShiftType = resolveShiftType(dto.getShiftType());
        List<ShiftAssignment> toSave = new ArrayList<>();

        for (Long userId : userIds) {
            User user = getUserForAssignment(userId);
            for (LocalDate shiftDate : shiftDates) {
                ensureNoOverlap(user.getId(), shiftDate, template, null);
                toSave.add(ShiftAssignment.builder()
                        .user(user)
                        .shiftTemplate(template)
                        .shiftDate(shiftDate)
                        .shiftType(assignmentShiftType)
                        .status(ShiftAssignmentStatus.ASSIGNED)
                        .note(normalizeNote(dto.getNote()))
                        .build());
            }
        }

        List<ShiftAssignment> saved = shiftAssignmentRepository.saveAll(toSave);
        return mapAssignments(saved);
    }

    @Override
    public ShiftAssignmentDTO updateAssignment(Long id, ShiftAssignmentUpdateDTO dto) {
        ShiftAssignment assignment = shiftAssignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAssignment", "id", id));

        ShiftAttendance attendance = shiftAttendanceRepository.findByAssignmentId(id).orElse(null);

        if (dto.getUserId() != null && !dto.getUserId().equals(assignment.getUser().getId())) {
            assignment.setUser(getUserForAssignment(dto.getUserId()));
        }
        if (dto.getShiftTemplateId() != null && !dto.getShiftTemplateId().equals(assignment.getShiftTemplate().getId())) {
            assignment.setShiftTemplate(getTemplateForAssignment(dto.getShiftTemplateId()));
        }
        if (dto.getShiftDate() != null) {
            assignment.setShiftDate(dto.getShiftDate());
        }
        if (dto.getShiftType() != null) {
            assignment.setShiftType(resolveShiftType(dto.getShiftType()));
        }
        if (dto.getNote() != null) {
            assignment.setNote(normalizeNote(dto.getNote()));
        }

        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            ShiftAssignmentStatus nextStatus = parseStatus(dto.getStatus());
            if (nextStatus == ShiftAssignmentStatus.CHECKED_IN || nextStatus == ShiftAssignmentStatus.COMPLETED) {
                throw new BadRequestException("Không thể cập nhật trực tiếp sang CHECKED_IN/COMPLETED");
            }
            if (nextStatus == ShiftAssignmentStatus.CANCELLED
                    && attendance != null
                    && attendance.getCheckInAt() != null
                    && attendance.getCheckOutAt() == null) {
                throw new BadRequestException("Ca đã check-in, không thể hủy trực tiếp");
            }
            assignment.setStatus(nextStatus);
        }

        if (assignment.getStatus() != ShiftAssignmentStatus.CANCELLED) {
            ensureNoOverlap(
                    assignment.getUser().getId(),
                    assignment.getShiftDate(),
                    assignment.getShiftTemplate(),
                    assignment.getId()
            );
        }

        ShiftAssignment saved = shiftAssignmentRepository.save(assignment);
        return mapAssignments(List.of(saved)).get(0);
    }

    @Override
    public ShiftAssignmentDTO cancelAssignment(Long id) {
        ShiftAssignment assignment = shiftAssignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAssignment", "id", id));
        ShiftAttendance attendance = shiftAttendanceRepository.findByAssignmentId(id).orElse(null);

        if (assignment.getStatus() == ShiftAssignmentStatus.COMPLETED) {
            throw new BadRequestException("Ca đã hoàn thành, không thể hủy");
        }
        if (assignment.getStatus() == ShiftAssignmentStatus.CHECKED_IN
                || (attendance != null && attendance.getCheckInAt() != null && attendance.getCheckOutAt() == null)) {
            throw new BadRequestException("Ca đang diễn ra, không thể hủy");
        }

        assignment.setStatus(ShiftAssignmentStatus.CANCELLED);
        ShiftAssignment saved = shiftAssignmentRepository.save(assignment);
        return mapAssignments(List.of(saved)).get(0);
    }

    @Override
    public ShiftAttendanceDTO checkIn(ShiftCheckInDTO dto) {
        User currentUser = getCurrentUser();
        ShiftAssignment assignment = shiftAssignmentRepository.findById(dto.getAssignmentId())
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAssignment", "id", dto.getAssignmentId()));

        ensureAssignmentOwnership(currentUser, assignment);
        if (assignment.getStatus() == ShiftAssignmentStatus.CANCELLED) {
            throw new BadRequestException("Ca đã bị hủy");
        }
        if (assignment.getStatus() == ShiftAssignmentStatus.COMPLETED) {
            throw new BadRequestException("Ca đã hoàn thành");
        }

        ShiftAttendance attendance = shiftAttendanceRepository.findByAssignmentId(assignment.getId())
                .orElseGet(() -> ShiftAttendance.builder().assignment(assignment).build());

        if (attendance.getCheckInAt() != null) {
            throw new BadRequestException("Ca này đã check-in trước đó");
        }

        LocalDateTime now = now();
        ShiftRange range = resolveShiftRange(assignment.getShiftDate(), assignment.getShiftTemplate());
        LocalDateTime earliestAllowed = range.startAt().minusHours(3);
        LocalDateTime latestAllowed = range.endAt().plusHours(6);
        if (now.isBefore(earliestAllowed) || now.isAfter(latestAllowed)) {
            throw new BadRequestException("Ngoài thời gian cho phép check-in của ca");
        }

        attendance.setCheckInAt(now);
        attendance.setCheckInSource(normalizeSource(dto.getSource()));
        assignment.setStatus(ShiftAssignmentStatus.CHECKED_IN);

        shiftAssignmentRepository.save(assignment);
        ShiftAttendance saved = shiftAttendanceRepository.save(attendance);
        return toAttendanceDTO(saved);
    }

    @Override
    public ShiftAttendanceDTO checkOut(ShiftCheckOutDTO dto) {
        User currentUser = getCurrentUser();
        ShiftAssignment assignment = shiftAssignmentRepository.findById(dto.getAssignmentId())
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAssignment", "id", dto.getAssignmentId()));

        ensureAssignmentOwnership(currentUser, assignment);
        if (assignment.getStatus() == ShiftAssignmentStatus.CANCELLED) {
            throw new BadRequestException("Ca đã bị hủy");
        }

        ShiftAttendance attendance = shiftAttendanceRepository.findByAssignmentId(assignment.getId())
                .orElseThrow(() -> new BadRequestException("Ca này chưa check-in"));

        if (attendance.getCheckInAt() == null) {
            throw new BadRequestException("Ca này chưa check-in");
        }
        if (attendance.getCheckOutAt() != null) {
            throw new BadRequestException("Ca này đã check-out trước đó");
        }

        LocalDateTime now = now();
        if (now.isBefore(attendance.getCheckInAt())) {
            throw new BadRequestException("Thời gian check-out không hợp lệ");
        }

        attendance.setCheckOutAt(now);
        attendance.setCheckOutSource(normalizeSource(dto.getSource()));
        assignment.setStatus(ShiftAssignmentStatus.COMPLETED);

        shiftAssignmentRepository.save(assignment);
        ShiftAttendance saved = shiftAttendanceRepository.save(attendance);
        return toAttendanceDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftAttendanceDTO> getAttendances(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType) {
        DateRange range = normalizeRange(fromDate, toDate);
        List<ShiftAttendance> attendances = userId == null
                ? shiftAttendanceRepository.findByShiftDateRange(range.fromDate(), range.toDate())
                : shiftAttendanceRepository.findByUserAndShiftDateRange(userId, range.fromDate(), range.toDate());
        if (shiftType != null) {
            attendances = attendances.stream()
                    .filter(attendance -> resolveAssignmentShiftType(attendance.getAssignment()) == shiftType)
                    .toList();
        }
        return attendances.stream().map(this::toAttendanceDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftAttendanceDTO> getMyAttendances(LocalDate fromDate, LocalDate toDate) {
        User currentUser = getCurrentUser();
        DateRange range = normalizeRange(fromDate, toDate);
        List<ShiftAttendance> attendances = shiftAttendanceRepository.findByUserAndShiftDateRange(
                currentUser.getId(),
                range.fromDate(),
                range.toDate()
        );
        return attendances.stream().map(this::toAttendanceDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftWorkSummaryDTO> getWorkSummary(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType) {
        DateRange range = normalizeRange(fromDate, toDate);
        LocalDate today = LocalDate.now(resolveZoneId());
        LocalDateTime nowSnapshot = now();

        List<ShiftAssignment> assignments = userId == null
                ? shiftAssignmentRepository.findByShiftDateBetweenOrderByShiftDateAsc(range.fromDate(), range.toDate())
                : shiftAssignmentRepository.findByUserIdAndShiftDateBetweenOrderByShiftDateAsc(userId, range.fromDate(), range.toDate());
        if (shiftType != null) {
            assignments = assignments.stream()
                    .filter(assignment -> resolveAssignmentShiftType(assignment) == shiftType)
                    .toList();
        }

        if (assignments.isEmpty()) {
            return List.of();
        }

        List<Long> assignmentIds = assignments.stream().map(ShiftAssignment::getId).toList();
        Map<Long, ShiftAttendance> attendanceByAssignment = shiftAttendanceRepository.findByAssignmentIdIn(assignmentIds)
                .stream()
                .collect(Collectors.toMap(att -> att.getAssignment().getId(), att -> att, (left, right) -> left));

        Map<String, ShiftWorkSummaryAccumulator> byUser = new java.util.LinkedHashMap<>();
        List<RevenueWindow> revenueWindows = new ArrayList<>();
        LocalDateTime minRevenueStart = null;
        LocalDateTime maxRevenueEnd = null;

        for (ShiftAssignment assignment : assignments) {
            Long assigneeId = assignment.getUser().getId();
            ShiftType assignmentShiftType = resolveAssignmentShiftType(assignment);
            String accumulatorKey = assigneeId + ":" + assignmentShiftType.name();
            ShiftWorkSummaryAccumulator accumulator = byUser.computeIfAbsent(
                    accumulatorKey,
                    key -> new ShiftWorkSummaryAccumulator(assignment.getUser().getId(), assignment.getUser().getFullName(), assignmentShiftType)
            );
            accumulator.totalAssignments++;

            ShiftAssignmentStatus status = assignment.getStatus();
            if (status == ShiftAssignmentStatus.ASSIGNED) {
                accumulator.assignedCount++;
            } else if (status == ShiftAssignmentStatus.CHECKED_IN) {
                accumulator.checkedInCount++;
            } else if (status == ShiftAssignmentStatus.COMPLETED) {
                accumulator.completedCount++;
            } else if (status == ShiftAssignmentStatus.CANCELLED) {
                accumulator.cancelledCount++;
            }

            ShiftAttendance attendance = attendanceByAssignment.get(assignment.getId());
            ShiftRange shiftRange = resolveShiftRange(assignment.getShiftDate(), assignment.getShiftTemplate());

            Long workedMinutes = calculateWorkedMinutes(attendance, assignment.getShiftTemplate().getBreakMinutes());
            if (workedMinutes != null) {
                accumulator.totalWorkedMinutes += workedMinutes;
            }

            Long lateMinutes = calculateLateMinutes(attendance, shiftRange.startAt());
            if (lateMinutes != null) {
                accumulator.totalLateMinutes += lateMinutes;
            }

            Long earlyLeaveMinutes = calculateEarlyLeaveMinutes(attendance, shiftRange.endAt());
            if (earlyLeaveMinutes != null) {
                accumulator.totalEarlyLeaveMinutes += earlyLeaveMinutes;
            }

            boolean absent = status == ShiftAssignmentStatus.ASSIGNED
                    && assignment.getShiftDate().isBefore(today)
                    && (attendance == null || attendance.getCheckInAt() == null);
            if (absent) {
                accumulator.absentCount++;
            }

            RevenueWindow revenueWindow = resolveRevenueWindow(assignment, attendance, nowSnapshot);
            if (revenueWindow != null) {
                revenueWindows.add(revenueWindow);
                minRevenueStart = minRevenueStart == null || revenueWindow.startAt().isBefore(minRevenueStart)
                        ? revenueWindow.startAt()
                        : minRevenueStart;
                maxRevenueEnd = maxRevenueEnd == null || revenueWindow.endAt().isAfter(maxRevenueEnd)
                        ? revenueWindow.endAt()
                        : maxRevenueEnd;
            }
        }

        if (!revenueWindows.isEmpty() && minRevenueStart != null && maxRevenueEnd != null) {
            List<SalesTransaction> paidTransactions = salesTransactionRepository.findPaidTransactionsInRange(minRevenueStart, maxRevenueEnd);
            for (SalesTransaction transaction : paidTransactions) {
                LocalDateTime transactionTime = resolvePaidTransactionTime(transaction);
                if (transactionTime == null) {
                    continue;
                }
                BigDecimal amount = transaction.getTotalAmount() == null ? BigDecimal.ZERO : transaction.getTotalAmount();
                if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                Long cashierId = transaction.getCashier() == null ? null : transaction.getCashier().getId();

                for (RevenueWindow window : revenueWindows) {
                    if (isWithinWindow(transactionTime, window.startAt(), window.endAt())) {
                        ShiftWorkSummaryAccumulator accumulator = byUser.get(window.accumulatorKey());
                        if (accumulator != null) {
                            accumulator.totalRevenueDuringShift = accumulator.totalRevenueDuringShift.add(amount);
                            if (cashierId != null && cashierId.equals(window.userId())) {
                                accumulator.totalCashierRevenueDuringShift = accumulator.totalCashierRevenueDuringShift.add(amount);
                            }
                        }
                    }
                }
            }
        }

        return byUser.values().stream()
                .map(this::toWorkSummaryDTO)
                .sorted((left, right) -> left.getUserFullName().compareToIgnoreCase(right.getUserFullName()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftRevenueDetailDTO> getRevenueDetails(LocalDate fromDate, LocalDate toDate, Long userId, ShiftType shiftType) {
        DateRange range = normalizeRange(fromDate, toDate);
        LocalDateTime nowSnapshot = now();

        List<ShiftAssignment> assignments = userId == null
                ? shiftAssignmentRepository.findByShiftDateBetweenOrderByShiftDateAsc(range.fromDate(), range.toDate())
                : shiftAssignmentRepository.findByUserIdAndShiftDateBetweenOrderByShiftDateAsc(userId, range.fromDate(), range.toDate());
        if (shiftType != null) {
            assignments = assignments.stream()
                    .filter(assignment -> resolveAssignmentShiftType(assignment) == shiftType)
                    .toList();
        }

        if (assignments.isEmpty()) {
            return List.of();
        }

        List<Long> assignmentIds = assignments.stream().map(ShiftAssignment::getId).toList();
        Map<Long, ShiftAttendance> attendanceByAssignment = shiftAttendanceRepository.findByAssignmentIdIn(assignmentIds)
                .stream()
                .collect(Collectors.toMap(att -> att.getAssignment().getId(), att -> att, (left, right) -> left));

        Map<Long, ShiftRevenueDetailAccumulator> detailByAssignment = new java.util.LinkedHashMap<>();
        List<RevenueWindow> revenueWindows = new ArrayList<>();
        LocalDateTime minRevenueStart = null;
        LocalDateTime maxRevenueEnd = null;

        for (ShiftAssignment assignment : assignments) {
            ShiftAttendance attendance = attendanceByAssignment.get(assignment.getId());
            ShiftRange scheduledRange = resolveShiftRange(assignment.getShiftDate(), assignment.getShiftTemplate());
            ShiftRevenueDetailAccumulator detail = new ShiftRevenueDetailAccumulator(assignment, attendance, scheduledRange);
            detailByAssignment.put(assignment.getId(), detail);

            RevenueWindow revenueWindow = resolveRevenueWindow(assignment, attendance, nowSnapshot);
            if (revenueWindow != null) {
                revenueWindows.add(revenueWindow);
                minRevenueStart = minRevenueStart == null || revenueWindow.startAt().isBefore(minRevenueStart)
                        ? revenueWindow.startAt()
                        : minRevenueStart;
                maxRevenueEnd = maxRevenueEnd == null || revenueWindow.endAt().isAfter(maxRevenueEnd)
                        ? revenueWindow.endAt()
                        : maxRevenueEnd;
            }
        }

        if (!revenueWindows.isEmpty() && minRevenueStart != null && maxRevenueEnd != null) {
            List<SalesTransaction> paidTransactions = salesTransactionRepository.findPaidTransactionsInRange(minRevenueStart, maxRevenueEnd);
            for (SalesTransaction transaction : paidTransactions) {
                LocalDateTime transactionTime = resolvePaidTransactionTime(transaction);
                if (transactionTime == null) {
                    continue;
                }
                BigDecimal amount = transaction.getTotalAmount() == null ? BigDecimal.ZERO : transaction.getTotalAmount();
                if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                Long cashierId = transaction.getCashier() == null ? null : transaction.getCashier().getId();

                for (RevenueWindow window : revenueWindows) {
                    if (isWithinWindow(transactionTime, window.startAt(), window.endAt())) {
                        ShiftRevenueDetailAccumulator detail = detailByAssignment.get(window.assignmentId());
                        if (detail != null) {
                            detail.transactionCount++;
                            detail.totalRevenueDuringShift = detail.totalRevenueDuringShift.add(amount);
                            detail.transactions.add(toRevenueTransactionDTO(transaction, transactionTime));
                            if (cashierId != null && cashierId.equals(window.userId())) {
                                detail.cashierTransactionCount++;
                                detail.totalCashierRevenueDuringShift = detail.totalCashierRevenueDuringShift.add(amount);
                            }
                        }
                    }
                }
            }
        }

        return detailByAssignment.values().stream()
                .map(this::toRevenueDetailDTO)
                .sorted((left, right) -> {
                    int dateCompare = left.getShiftDate().compareTo(right.getShiftDate());
                    if (dateCompare != 0) return dateCompare;
                    return left.getScheduledStartAt().compareTo(right.getScheduledStartAt());
                })
                .toList();
    }

    private ShiftWorkSummaryDTO toWorkSummaryDTO(ShiftWorkSummaryAccumulator item) {
        BigDecimal totalRevenue = item.totalRevenueDuringShift == null ? BigDecimal.ZERO : item.totalRevenueDuringShift;
        BigDecimal avgRevenue = item.completedCount > 0
                ? totalRevenue.divide(BigDecimal.valueOf(item.completedCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return ShiftWorkSummaryDTO.builder()
                .userId(item.userId)
                .userFullName(item.userFullName)
                .shiftType(item.shiftType)
                .totalAssignments(item.totalAssignments)
                .assignedCount(item.assignedCount)
                .checkedInCount(item.checkedInCount)
                .completedCount(item.completedCount)
                .cancelledCount(item.cancelledCount)
                .absentCount(item.absentCount)
                .totalWorkedMinutes(item.totalWorkedMinutes)
                .totalLateMinutes(item.totalLateMinutes)
                .totalEarlyLeaveMinutes(item.totalEarlyLeaveMinutes)
                .totalRevenueDuringShift(totalRevenue)
                .averageRevenuePerCompletedShift(avgRevenue)
                .totalCashierRevenueDuringShift(item.totalCashierRevenueDuringShift)
                .build();
    }

    private RevenueWindow resolveRevenueWindow(ShiftAssignment assignment,
                                               ShiftAttendance attendance,
                                               LocalDateTime nowSnapshot) {
        if (resolveAssignmentShiftType(assignment) != ShiftType.POS_COUNTER) {
            return null;
        }

        ShiftAssignmentStatus status = assignment.getStatus();
        if (status == ShiftAssignmentStatus.CANCELLED) {
            return null;
        }

        ShiftRange scheduledRange = resolveShiftRange(assignment.getShiftDate(), assignment.getShiftTemplate());
        LocalDateTime startAt;
        LocalDateTime endAt;

        if (attendance != null && attendance.getCheckInAt() != null) {
            startAt = attendance.getCheckInAt();
            endAt = attendance.getCheckOutAt() != null ? attendance.getCheckOutAt() : nowSnapshot;
        } else if (status == ShiftAssignmentStatus.COMPLETED) {
            // Fallback for legacy completed shifts that missed check-in/out records.
            startAt = scheduledRange.startAt();
            endAt = scheduledRange.endAt();
        } else {
            return null;
        }

        if (endAt.isBefore(startAt)) {
            endAt = startAt;
        }

        String accumulatorKey = assignment.getUser().getId() + ":" + resolveAssignmentShiftType(assignment).name();
        return new RevenueWindow(assignment.getId(), accumulatorKey, assignment.getUser().getId(), startAt, endAt);
    }

    private ShiftRevenueDetailDTO toRevenueDetailDTO(ShiftRevenueDetailAccumulator item) {
        ShiftAssignment assignment = item.assignment;
        ShiftAttendance attendance = item.attendance;
        return ShiftRevenueDetailDTO.builder()
                .assignmentId(assignment.getId())
                .userId(assignment.getUser().getId())
                .userFullName(assignment.getUser().getFullName())
                .shiftTemplateName(assignment.getShiftTemplate().getName())
                .shiftType(resolveAssignmentShiftType(assignment))
                .shiftDate(assignment.getShiftDate())
                .status(assignment.getStatus().name())
                .scheduledStartAt(item.scheduledRange.startAt())
                .scheduledEndAt(item.scheduledRange.endAt())
                .checkInAt(attendance == null ? null : attendance.getCheckInAt())
                .checkOutAt(attendance == null ? null : attendance.getCheckOutAt())
                .workedMinutes(calculateWorkedMinutes(attendance, assignment.getShiftTemplate().getBreakMinutes()))
                .transactionCount(item.transactionCount)
                .cashierTransactionCount(item.cashierTransactionCount)
                .totalRevenueDuringShift(item.totalRevenueDuringShift)
                .totalCashierRevenueDuringShift(item.totalCashierRevenueDuringShift)
                .transactions(item.transactions)
                .build();
    }

    private ShiftRevenueTransactionDTO toRevenueTransactionDTO(SalesTransaction transaction, LocalDateTime paidAt) {
        C2SE._1.Capstone2.entity.Order order = transaction.getOrder();
        User cashier = transaction.getCashier();
        return ShiftRevenueTransactionDTO.builder()
                .salesTransactionId(transaction.getId())
                .orderId(order == null ? null : order.getId())
                .paidAt(paidAt)
                .paymentMethod(transaction.getPaymentMethod())
                .cashierName(cashier == null ? null : cashier.getFullName())
                .tableNumber(order == null ? null : order.getTableNumber())
                .customerPhone(order == null ? null : order.getCustomerPhone())
                .voucherCode(order == null ? null : order.getVoucherCode())
                .discountAmount(order == null ? BigDecimal.ZERO : order.getDiscountAmount())
                .totalAmount(transaction.getTotalAmount())
                .build();
    }

    private LocalDateTime resolvePaidTransactionTime(SalesTransaction transaction) {
        if (transaction == null) {
            return null;
        }
        if (transaction.getPaidAt() != null) {
            return transaction.getPaidAt();
        }
        if (transaction.getUpdatedAt() != null) {
            return transaction.getUpdatedAt();
        }
        return transaction.getCreatedAt();
    }

    private boolean isWithinWindow(LocalDateTime value, LocalDateTime startAt, LocalDateTime endAt) {
        return !value.isBefore(startAt) && !value.isAfter(endAt);
    }

    private void validateTemplate(ShiftTemplateDTO dto) {
        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw new BadRequestException("Giờ bắt đầu/kết thúc không được để trống");
        }
        if (dto.getStartTime().equals(dto.getEndTime())) {
            throw new BadRequestException("Giờ bắt đầu và kết thúc không được trùng nhau");
        }
        int breakMinutes = dto.getBreakMinutes() == null ? 0 : dto.getBreakMinutes();
        if (breakMinutes < 0 || breakMinutes > 240) {
            throw new BadRequestException("Thời gian nghỉ phải trong khoảng 0-240 phút");
        }
    }

    private User getUserForAssignment(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BadRequestException("Nhân viên đã bị khóa: " + user.getFullName());
        }
        return user;
    }

    private ShiftTemplate getTemplateForAssignment(Long shiftTemplateId) {
        ShiftTemplate template = shiftTemplateRepository.findById(shiftTemplateId)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftTemplate", "id", shiftTemplateId));
        if (!Boolean.TRUE.equals(template.getActive())) {
            throw new BadRequestException("Mẫu ca đã ngừng sử dụng: " + template.getName());
        }
        return template;
    }

    private void ensureNoOverlap(Long userId, LocalDate shiftDate, ShiftTemplate template, Long excludeAssignmentId) {
        if (userId == null || shiftDate == null || template == null) {
            throw new BadRequestException("Dữ liệu phân ca không hợp lệ");
        }

        ShiftRange candidateRange = resolveShiftRange(shiftDate, template);
        List<ShiftAssignment> assignments = shiftAssignmentRepository.findByUserIdAndShiftDateAndStatusIn(
                userId,
                shiftDate,
                OVERLAP_BLOCK_STATUSES
        );

        for (ShiftAssignment existing : assignments) {
            if (excludeAssignmentId != null && excludeAssignmentId.equals(existing.getId())) {
                continue;
            }
            ShiftTemplate existingTemplate = existing.getShiftTemplate();
            if (existingTemplate == null) {
                continue;
            }
            ShiftRange existingRange = resolveShiftRange(existing.getShiftDate(), existingTemplate);
            if (isOverlapping(candidateRange, existingRange)) {
                throw new BadRequestException("Nhân viên đã có ca trùng giờ trong ngày " + shiftDate);
            }
        }
    }

    private List<ShiftAssignmentDTO> mapAssignments(List<ShiftAssignment> assignments) {
        if (assignments == null || assignments.isEmpty()) {
            return List.of();
        }

        List<Long> assignmentIds = assignments.stream().map(ShiftAssignment::getId).toList();
        Map<Long, ShiftAttendance> attendanceByAssignment = shiftAttendanceRepository.findByAssignmentIdIn(assignmentIds)
                .stream()
                .collect(Collectors.toMap(att -> att.getAssignment().getId(), att -> att, (left, right) -> left));

        return assignments.stream()
                .map(assignment -> toAssignmentDTO(assignment, attendanceByAssignment.get(assignment.getId())))
                .toList();
    }

    private ShiftTemplateDTO toTemplateDTO(ShiftTemplate template) {
        return ShiftTemplateDTO.builder()
                .id(template.getId())
                .name(template.getName())
                .startTime(template.getStartTime())
                .endTime(template.getEndTime())
                .breakMinutes(template.getBreakMinutes())
                .shiftType(resolveShiftType(template.getShiftType()))
                .active(template.getActive())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    private ShiftAssignmentDTO toAssignmentDTO(ShiftAssignment assignment, ShiftAttendance attendance) {
        ShiftRange range = resolveShiftRange(assignment.getShiftDate(), assignment.getShiftTemplate());
        return ShiftAssignmentDTO.builder()
                .id(assignment.getId())
                .userId(assignment.getUser().getId())
                .userFullName(assignment.getUser().getFullName())
                .shiftTemplateId(assignment.getShiftTemplate().getId())
                .shiftTemplateName(assignment.getShiftTemplate().getName())
                .shiftType(resolveAssignmentShiftType(assignment))
                .shiftDate(assignment.getShiftDate())
                .startTime(assignment.getShiftTemplate().getStartTime())
                .endTime(assignment.getShiftTemplate().getEndTime())
                .breakMinutes(assignment.getShiftTemplate().getBreakMinutes())
                .status(assignment.getStatus().name())
                .note(assignment.getNote())
                .scheduledStartAt(range.startAt())
                .scheduledEndAt(range.endAt())
                .checkInAt(attendance == null ? null : attendance.getCheckInAt())
                .checkOutAt(attendance == null ? null : attendance.getCheckOutAt())
                .workedMinutes(calculateWorkedMinutes(attendance, assignment.getShiftTemplate().getBreakMinutes()))
                .lateMinutes(calculateLateMinutes(attendance, range.startAt()))
                .earlyLeaveMinutes(calculateEarlyLeaveMinutes(attendance, range.endAt()))
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }

    private ShiftAttendanceDTO toAttendanceDTO(ShiftAttendance attendance) {
        ShiftAssignment assignment = attendance.getAssignment();
        ShiftRange range = resolveShiftRange(assignment.getShiftDate(), assignment.getShiftTemplate());
        return ShiftAttendanceDTO.builder()
                .id(attendance.getId())
                .assignmentId(assignment.getId())
                .userId(assignment.getUser().getId())
                .userFullName(assignment.getUser().getFullName())
                .shiftTemplateName(assignment.getShiftTemplate().getName())
                .shiftType(resolveAssignmentShiftType(assignment))
                .shiftDate(assignment.getShiftDate())
                .status(assignment.getStatus().name())
                .scheduledStartAt(range.startAt())
                .scheduledEndAt(range.endAt())
                .checkInAt(attendance.getCheckInAt())
                .checkOutAt(attendance.getCheckOutAt())
                .checkInSource(attendance.getCheckInSource())
                .checkOutSource(attendance.getCheckOutSource())
                .workedMinutes(calculateWorkedMinutes(attendance, assignment.getShiftTemplate().getBreakMinutes()))
                .lateMinutes(calculateLateMinutes(attendance, range.startAt()))
                .earlyLeaveMinutes(calculateEarlyLeaveMinutes(attendance, range.endAt()))
                .build();
    }

    private Long calculateWorkedMinutes(ShiftAttendance attendance, Integer breakMinutes) {
        if (attendance == null || attendance.getCheckInAt() == null || attendance.getCheckOutAt() == null) {
            return null;
        }
        // Phút công = thời gian thực tế từ check-in đến check-out (không trừ giờ nghỉ)
        return Math.max(0, Duration.between(attendance.getCheckInAt(), attendance.getCheckOutAt()).toMinutes());
    }

    private Long calculateLateMinutes(ShiftAttendance attendance, LocalDateTime scheduledStartAt) {
        if (attendance == null || attendance.getCheckInAt() == null) {
            return null;
        }
        long late = Duration.between(scheduledStartAt, attendance.getCheckInAt()).toMinutes();
        return Math.max(0, late);
    }

    private Long calculateEarlyLeaveMinutes(ShiftAttendance attendance, LocalDateTime scheduledEndAt) {
        if (attendance == null || attendance.getCheckOutAt() == null) {
            return null;
        }
        long early = Duration.between(attendance.getCheckOutAt(), scheduledEndAt).toMinutes();
        return Math.max(0, early);
    }

    private ShiftRange resolveShiftRange(LocalDate shiftDate, ShiftTemplate template) {
        LocalDateTime startAt = LocalDateTime.of(shiftDate, template.getStartTime());
        LocalDateTime endAt = LocalDateTime.of(shiftDate, template.getEndTime());
        if (!endAt.isAfter(startAt)) {
            endAt = endAt.plusDays(1);
        }
        return new ShiftRange(startAt, endAt);
    }

    private boolean isOverlapping(ShiftRange left, ShiftRange right) {
        return left.startAt().isBefore(right.endAt()) && right.startAt().isBefore(left.endAt());
    }

    private ShiftAssignmentStatus parseStatus(String status) {
        try {
            return ShiftAssignmentStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Trạng thái ca làm không hợp lệ: " + status);
        }
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Access denied");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    private void ensureAssignmentOwnership(User currentUser, ShiftAssignment assignment) {
        if (currentUser == null || assignment == null || assignment.getUser() == null) {
            throw new AccessDeniedException("Access denied");
        }
        if (!assignment.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Bạn chỉ có thể thao tác ca của chính mình");
        }
    }

    private DateRange normalizeRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate today = LocalDate.now(resolveZoneId());
        LocalDate from = fromDate == null ? today.minusDays(7) : fromDate;
        LocalDate to = toDate == null ? today.plusDays(14) : toDate;

        if (from.isAfter(to)) {
            LocalDate temp = from;
            from = to;
            to = temp;
        }

        if (Duration.between(from.atStartOfDay(), to.plusDays(1).atStartOfDay()).toDays() > 120) {
            throw new BadRequestException("Khoảng thời gian truy vấn tối đa là 120 ngày");
        }

        return new DateRange(from, to);
    }

    private LocalDateTime now() {
        return ZonedDateTime.now(resolveZoneId()).toLocalDateTime();
    }

    private ZoneId resolveZoneId() {
        try {
            return ZoneId.of(appTimezone);
        } catch (Exception ignored) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    private String normalizeName(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Tên ca không được để trống");
        }
        return value.trim();
    }

    private ShiftType resolveShiftType(ShiftType shiftType) {
        return shiftType == null ? ShiftType.POS_COUNTER : shiftType;
    }

    private ShiftType resolveAssignmentShiftType(ShiftAssignment assignment) {
        if (assignment == null) {
            return ShiftType.POS_COUNTER;
        }
        if (assignment.getShiftType() != null) {
            return assignment.getShiftType();
        }
        ShiftTemplate template = assignment.getShiftTemplate();
        return template == null ? ShiftType.POS_COUNTER : resolveShiftType(template.getShiftType());
    }

    private String normalizeNote(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeSource(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_CHECK_SOURCE;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() > 50) {
            return normalized.substring(0, 50);
        }
        return normalized;
    }

    private record ShiftRange(LocalDateTime startAt, LocalDateTime endAt) {}

    private record DateRange(LocalDate fromDate, LocalDate toDate) {}

    private record RevenueWindow(Long assignmentId, String accumulatorKey, Long userId, LocalDateTime startAt, LocalDateTime endAt) {}

    private static class ShiftRevenueDetailAccumulator {
        private final ShiftAssignment assignment;
        private final ShiftAttendance attendance;
        private final ShiftRange scheduledRange;
        private long transactionCount;
        private long cashierTransactionCount;
        private BigDecimal totalRevenueDuringShift = BigDecimal.ZERO;
        private BigDecimal totalCashierRevenueDuringShift = BigDecimal.ZERO;
        private List<ShiftRevenueTransactionDTO> transactions = new ArrayList<>();

        private ShiftRevenueDetailAccumulator(ShiftAssignment assignment, ShiftAttendance attendance, ShiftRange scheduledRange) {
            this.assignment = assignment;
            this.attendance = attendance;
            this.scheduledRange = scheduledRange;
        }
    }

    private static class ShiftWorkSummaryAccumulator {
        private final Long userId;
        private final String userFullName;
        private final ShiftType shiftType;

        private long totalAssignments;
        private long assignedCount;
        private long checkedInCount;
        private long completedCount;
        private long cancelledCount;
        private long absentCount;
        private long totalWorkedMinutes;
        private long totalLateMinutes;
        private long totalEarlyLeaveMinutes;
        private BigDecimal totalRevenueDuringShift = BigDecimal.ZERO;
        private BigDecimal totalCashierRevenueDuringShift = BigDecimal.ZERO;

        private ShiftWorkSummaryAccumulator(Long userId, String userFullName, ShiftType shiftType) {
            this.userId = userId;
            this.userFullName = userFullName;
            this.shiftType = shiftType;
        }
    }
}
