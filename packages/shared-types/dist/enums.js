"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.ChannelCode = exports.HousekeepingStatus = exports.RoomOperationalStatus = exports.PaymentStatus = exports.BookingStatus = exports.PermissionCode = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["FRONT_DESK"] = "FRONT_DESK";
    UserRole["HOUSEKEEPING"] = "HOUSEKEEPING";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    UserRole["REVENUE_MANAGER"] = "REVENUE_MANAGER";
})(UserRole || (exports.UserRole = UserRole = {}));
var PermissionCode;
(function (PermissionCode) {
    // Properties & Settings
    PermissionCode["PROPERTY_READ"] = "property:read";
    PermissionCode["PROPERTY_UPDATE"] = "property:update";
    PermissionCode["SETTINGS_MANAGE"] = "settings:manage";
    PermissionCode["TAX_MANAGE"] = "tax:manage";
    // Bookings & Tape Chart
    PermissionCode["BOOKING_READ"] = "booking:read";
    PermissionCode["BOOKING_CREATE"] = "booking:create";
    PermissionCode["BOOKING_UPDATE"] = "booking:update";
    PermissionCode["BOOKING_CANCEL"] = "booking:cancel";
    PermissionCode["TAPE_CHART_VIEW"] = "tape_chart:view";
    PermissionCode["TAPE_CHART_EDIT"] = "tape_chart:edit";
    // Rates & Inventory
    PermissionCode["RATES_VIEW"] = "rates:view";
    PermissionCode["RATES_UPDATE"] = "rates:update";
    PermissionCode["INVENTORY_VIEW"] = "inventory:view";
    PermissionCode["INVENTORY_UPDATE"] = "inventory:update";
    // Channel Manager
    PermissionCode["CHANNEL_VIEW"] = "channel:view";
    PermissionCode["CHANNEL_SYNC"] = "channel:sync";
    PermissionCode["CHANNEL_CONFIG"] = "channel:config";
    // Front Office
    PermissionCode["FRONT_DESK_CHECKIN"] = "front_desk:checkin";
    PermissionCode["FRONT_DESK_CHECKOUT"] = "front_desk:checkout";
    PermissionCode["FOLIO_CHARGE"] = "folio:charge";
    PermissionCode["FOLIO_PAYMENT"] = "folio:payment";
    PermissionCode["NIGHT_AUDIT_EXECUTE"] = "night_audit:execute";
    // Housekeeping
    PermissionCode["HOUSEKEEPING_VIEW"] = "housekeeping:view";
    PermissionCode["HOUSEKEEPING_UPDATE"] = "housekeeping:update";
    // Reports & Back Office
    PermissionCode["REPORTS_VIEW"] = "reports:view";
    PermissionCode["REPORTS_EXPORT"] = "reports:export";
    PermissionCode["FINANCE_VIEW"] = "finance:view";
    PermissionCode["AUDIT_LOG_VIEW"] = "audit_log:view";
})(PermissionCode || (exports.PermissionCode = PermissionCode = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["CHECKED_IN"] = "CHECKED_IN";
    BookingStatus["CHECKED_OUT"] = "CHECKED_OUT";
    BookingStatus["CANCELLED"] = "CANCELLED";
    BookingStatus["NO_SHOW"] = "NO_SHOW";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["UNPAID"] = "UNPAID";
    PaymentStatus["PARTIAL"] = "PARTIAL";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var RoomOperationalStatus;
(function (RoomOperationalStatus) {
    RoomOperationalStatus["AVAILABLE"] = "AVAILABLE";
    RoomOperationalStatus["OCCUPIED"] = "OCCUPIED";
    RoomOperationalStatus["OUT_OF_ORDER"] = "OUT_OF_ORDER";
    RoomOperationalStatus["MAINTENANCE"] = "MAINTENANCE";
})(RoomOperationalStatus || (exports.RoomOperationalStatus = RoomOperationalStatus = {}));
var HousekeepingStatus;
(function (HousekeepingStatus) {
    HousekeepingStatus["CLEAN"] = "CLEAN";
    HousekeepingStatus["DIRTY"] = "DIRTY";
    HousekeepingStatus["INSPECTED"] = "INSPECTED";
    HousekeepingStatus["TOUCH_UP"] = "TOUCH_UP";
})(HousekeepingStatus || (exports.HousekeepingStatus = HousekeepingStatus = {}));
var ChannelCode;
(function (ChannelCode) {
    ChannelCode["AGODA"] = "AGODA";
    ChannelCode["BOOKING_COM"] = "BOOKING_COM";
    ChannelCode["TRAVELOKA"] = "TRAVELOKA";
    ChannelCode["TIKET_COM"] = "TIKET_COM";
    ChannelCode["EXPEDIA"] = "EXPEDIA";
    ChannelCode["DIRECT"] = "DIRECT";
})(ChannelCode || (exports.ChannelCode = ChannelCode = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["EDC_CARD"] = "EDC_CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["QRIS"] = "QRIS";
    PaymentMethod["VIRTUAL_ACCOUNT"] = "VIRTUAL_ACCOUNT";
    PaymentMethod["OTA_VIRTUAL_CARD"] = "OTA_VIRTUAL_CARD";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
//# sourceMappingURL=enums.js.map