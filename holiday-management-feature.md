# Holiday Management Feature

## Overview
Complete holiday calendar management system with recurring holiday auto-generation and business hours override functionality.

## Features

### 1. Holiday CRUD Management
- Create, read, update, delete holidays with full validation
- Support for 6 holiday types: PUBLIC_HOLIDAY, CULTURAL, RELIGIOUS, SCHOOL, COMPANY, OTHER
- Discount percentage support (0-100%)
- Mark holidays as recurring for auto-generation

### 2. Recurring Holiday Auto-Generation
- Auto-generate future year instances of recurring holidays
- Preserve same month/day across years
- Handle leap year edge cases gracefully
- Prevent duplicate entries automatically
- Copy all properties (discount, type, business hours)

### 3. Business Hours Override
- Define special business hours for specific holidays
- Control if business is open on holiday (`openOnHoliday` flag)
- Set custom start/end times (`overrideStartTime`, `overrideEndTime`)
- Add special notes (e.g., "Limited menu", "Delivery only")

### 4. Holiday Query & Sync
- Query holidays by date, date range, month, year, type
- Check if specific date is holiday
- Sync from Calendarific API (auto-marks as recurring)
- Get upcoming holidays

## Customer Guide
- Customers see holiday schedules affecting business hours
- View special notes about holiday operations
- See discount promotions for holiday periods

## Admin/Manager Guide
- Create and manage holiday calendar
- Trigger recurring holiday generation for next N years (default 5, max 10)
- Update business hours per holiday
- Sync holidays from external calendar source
- Set holiday-specific promotions and discounts

## Technical Architecture

### Database Schema
```
holiday_calendar:
- id (PK)
- name (VARCHAR 200, unique with date)
- holiday_date (DATE, indexed)
- holiday_type (ENUM)
- is_recurring (BOOLEAN, default false, indexed)
- description (VARCHAR 500)
- discount_percent (DECIMAL 5,2, default 0)
- is_open_on_holiday (BOOLEAN, default false)
- override_start_time (TIME, nullable)
- override_end_time (TIME, nullable)
- special_notes (VARCHAR 500)
- created_at, updated_at (TIMESTAMP)
```

### Entity Classes
- `HolidayCalendar` - JPA entity with 6 holiday types enum
- `HolidayCalendarDTO` - DTO with validation annotations
- `HolidayType` enum - PUBLIC_HOLIDAY, CULTURAL, RELIGIOUS, SCHOOL, COMPANY, OTHER

### Service Layer
- `HolidayCalendarService` - Interface defining all operations
- `HolidayCalendarServiceImpl` - Implementation with business logic
- Repository methods for querying holidays
- Mapper for entity ↔ DTO conversion

### Controller Endpoints
- `GET /api/v1/holidays` - Get all holidays
- `GET /api/v1/holidays/{id}` - Get holiday by ID
- `GET /api/v1/holidays/range` - Get holidays by date range
- `GET /api/v1/holidays/month` - Get holidays by month/year
- `GET /api/v1/holidays/upcoming` - Get upcoming holidays
- `GET /api/v1/holidays/by-type` - Get holidays by type
- `GET /api/v1/holidays/by-year` - Get holidays by year
- `GET /api/v1/holidays/check/{date}` - Check if date is holiday
- `POST /api/v1/holidays` - Create holiday (ADMIN/MANAGER)
- `PUT /api/v1/holidays/{id}` - Update holiday (ADMIN/MANAGER)
- `DELETE /api/v1/holidays/{id}` - Delete holiday (ADMIN/MANAGER)
- `POST /api/v1/holidays/sync-calendarific` - Sync from API (ADMIN)
- `POST /api/v1/holidays/generate-recurring` - Generate recurring (ADMIN)
- `PUT /api/v1/holidays/{id}/business-hours` - Update business hours (ADMIN/MANAGER)

## API Reference

### Create Holiday
```
POST /api/v1/holidays
Content-Type: application/json

{
  "name": "Tết Nguyên Đán",
  "holidayDate": "2026-02-17",
  "holidayType": "PUBLIC_HOLIDAY",
  "recurring": true,
  "description": "Lunar New Year",
  "discountPercent": 15.00
}
```

### Generate Recurring Holidays
```
POST /api/v1/holidays/generate-recurring?years=5

Response:
{
  "success": true,
  "data": {
    "years": 5,
    "generated": 12
  },
  "message": "Đã tạo 12 ngày lễ tái diễn cho 5 năm tới"
}
```

### Update Business Hours
```
PUT /api/v1/holidays/1/business-hours
Content-Type: application/json

{
  "openOnHoliday": true,
  "overrideStartTime": "09:00:00",
  "overrideEndTime": "20:00:00",
  "specialNotes": "Limited menu available"
}
```

### Check if Date is Holiday
```
GET /api/v1/holidays/check/2026-02-17

Response:
{
  "success": true,
  "data": {
    "date": "2026-02-17",
    "isHoliday": true,
    "holiday": {
      "id": 1,
      "name": "Tết Nguyên Đán",
      "holidayDate": "2026-02-17",
      "holidayType": "PUBLIC_HOLIDAY",
      "openOnHoliday": true,
      "overrideStartTime": "09:00:00",
      "overrideEndTime": "20:00:00",
      "specialNotes": "Limited menu available"
    }
  }
}
```

## Database Migration
File: `2026-05-12_add_business_hours_override_to_holidays.sql`

```sql
ALTER TABLE holiday_calendar
ADD COLUMN IF NOT EXISTS is_open_on_holiday BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS override_start_time TIME,
ADD COLUMN IF NOT EXISTS override_end_time TIME,
ADD COLUMN IF NOT EXISTS special_notes VARCHAR(500),
ADD INDEX IF NOT EXISTS idx_is_open_on_holiday (is_open_on_holiday),
ADD INDEX IF NOT EXISTS idx_is_recurring (is_recurring);
```

## Holiday Types
- **PUBLIC_HOLIDAY** - National holidays (Tết, National Day)
- **CULTURAL** - Cultural celebrations (Tet, Mid-Autumn)
- **RELIGIOUS** - Religious holidays (Christmas, Easter)
- **SCHOOL** - School-related (Summer break)
- **COMPANY** - Company-specific (Founding day)
- **OTHER** - Miscellaneous

## Business Hours Override
- `openOnHoliday` (boolean) - Is business open on this day?
- `overrideStartTime` (HH:mm:ss) - Custom opening time
- `overrideEndTime` (HH:mm:ss) - Custom closing time
- `specialNotes` (text) - Additional info for customers

Examples:
- Holiday closed: `openOnHoliday=false`
- Holiday with limited hours: `openOnHoliday=true, 09:00-18:00`
- Holiday with extended hours: `openOnHoliday=true, 08:00-22:00`
- Special service note: `specialNotes="Delivery only"`

## Security & Authorization
- Public read access: Anyone can view holidays and check dates
- Create/Update/Delete: Requires ADMIN or MANAGER role
- Generate recurring: ADMIN only
- Sync from Calendarific: ADMIN only
- Update business hours: ADMIN or MANAGER only

## Error Handling
- Unique constraint on (holiday_date, name) - prevents duplicate exact holidays
- Validation on discount percent (0-100%)
- LocalTime parsing with graceful error messages
- Edge case handling for leap year recurring holidays
- Duplicate prevention in recurring generation

## Recurring Holiday Logic
1. Find all holidays with `recurring=true`
2. For each year in next N years:
   - Preserve month/day from original
   - Create entry if doesn't exist
   - Handle Feb 29 edge cases (skip in non-leap years)
   - Copy all properties (discount, business hours, notes)
3. Return count of generated entries

## Integration Points

### With Order Management
- Check if order date is holiday before confirming
- Use holiday business hours instead of normal hours
- Apply holiday discounts automatically

### With Customer Notifications
- Notify customers of holiday schedule changes
- Alert about limited hours or closures
- Promote holiday-specific discounts

### With AI Prediction
- Exclude closed holiday dates from demand prediction
- Adjust forecasting for limited-hour holidays
- Account for holiday patterns in trends

### With Calendar Sync
- Auto-import holidays from Calendarific
- Mark imported holidays as `recurring=true`
- Update existing holidays from sync

## Testing Checklist
- [ ] Create holiday with all fields → Returns 201 CREATED
- [ ] Update holiday → Returns updated entity with message
- [ ] Delete holiday → Returns 200 OK
- [ ] Query by date range → Returns all holidays in range
- [ ] Query by month/year → Returns correct holidays
- [ ] Check if date is holiday → Returns isHoliday flag
- [ ] Generate recurring holidays → Creates entries for N years
- [ ] Duplicate prevention → Doesn't create duplicate entries
- [ ] Leap year handling → Skips Feb 29 in non-leap years
- [ ] Update business hours → Saves override times
- [ ] Sync from Calendarific → Marks as recurring
- [ ] Authorization checks → Non-ADMIN cannot create/delete
- [ ] Validation errors → Invalid data rejected with messages

## Future Enhancements
- Scheduled auto-generation: `@Scheduled` at year-end
- Business hours templates: Reusable time patterns
- Staff availability: Link holidays to shift management
- Event reminders: Notify customers of upcoming holidays
- Historical analysis: Track actual vs. override hours
- Holiday conflicts: Warn on overlapping dates
- Multi-language support: Holiday names in multiple languages
- Time zone support: Handle different timezone holidays

## File Structure
```
Backend/Capstone2/src/main/java/C2SE/_1/Capstone2/
├── entity/HolidayCalendar.java (JPA entity with 4 new fields)
├── dto/HolidayCalendarDTO.java (DTO with validation)
├── service/HolidayCalendarService.java (interface)
├── service/impl/HolidayCalendarServiceImpl.java (implementation)
├── repository/HolidayCalendarRepository.java (JPA repository)
└── controller/HolidayCalendarController.java (REST endpoints)

sql/backfill/
└── 2026-05-12_add_business_hours_override_to_holidays.sql (migration)
```

## Version History
| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2026-05-12 | Add recurring holiday auto-generation and business hours override |
| 1.0 | 2026-04-XX | Initial CRUD implementation |

## Support
For issues with holiday management:
- Check database schema: `DESCRIBE holiday_calendar`
- Verify holiday exists: `SELECT * FROM holiday_calendar WHERE holiday_date = ?`
- Check business hours: `SELECT * FROM holiday_calendar WHERE is_open_on_holiday = true`
- Review sync logs: Search "HolidayCalendarService" in application logs
