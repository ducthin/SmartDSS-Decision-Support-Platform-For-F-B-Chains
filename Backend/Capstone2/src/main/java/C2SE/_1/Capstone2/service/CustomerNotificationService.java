package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.NotificationTestResultDTO;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.entity.Voucher;

public interface CustomerNotificationService {

    void notifyTierVoucherIssued(String phone, Voucher voucher, String tierLabel);

    void notifyPromotionVoucher(Voucher voucher);

    void notifyEventPromotion(Event event);

    void notifyHolidayPromotion(HolidayCalendar holiday);

    NotificationTestResultDTO sendTestNotification(String phone, String message);
}
