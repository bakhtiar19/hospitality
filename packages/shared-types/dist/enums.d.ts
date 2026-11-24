export declare enum UserRole {
    OWNER = "OWNER",
    MANAGER = "MANAGER",
    FRONT_DESK = "FRONT_DESK",
    HOUSEKEEPING = "HOUSEKEEPING",
    ACCOUNTANT = "ACCOUNTANT",
    REVENUE_MANAGER = "REVENUE_MANAGER"
}
export declare enum PermissionCode {
    PROPERTY_READ = "property:read",
    PROPERTY_UPDATE = "property:update",
    SETTINGS_MANAGE = "settings:manage",
    TAX_MANAGE = "tax:manage",
    BOOKING_READ = "booking:read",
    BOOKING_CREATE = "booking:create",
    BOOKING_UPDATE = "booking:update",
    BOOKING_CANCEL = "booking:cancel",
    TAPE_CHART_VIEW = "tape_chart:view",
    TAPE_CHART_EDIT = "tape_chart:edit",
    RATES_VIEW = "rates:view",
    RATES_UPDATE = "rates:update",
    INVENTORY_VIEW = "inventory:view",
    INVENTORY_UPDATE = "inventory:update",
    CHANNEL_VIEW = "channel:view",
    CHANNEL_SYNC = "channel:sync",
    CHANNEL_CONFIG = "channel:config",
    FRONT_DESK_CHECKIN = "front_desk:checkin",
    FRONT_DESK_CHECKOUT = "front_desk:checkout",
    FOLIO_CHARGE = "folio:charge",
    FOLIO_PAYMENT = "folio:payment",
    NIGHT_AUDIT_EXECUTE = "night_audit:execute",
    HOUSEKEEPING_VIEW = "housekeeping:view",
    HOUSEKEEPING_UPDATE = "housekeeping:update",
    REPORTS_VIEW = "reports:view",
    REPORTS_EXPORT = "reports:export",
    FINANCE_VIEW = "finance:view",
    AUDIT_LOG_VIEW = "audit_log:view"
}
export declare enum BookingStatus {
    CONFIRMED = "CONFIRMED",
    CHECKED_IN = "CHECKED_IN",
    CHECKED_OUT = "CHECKED_OUT",
    CANCELLED = "CANCELLED",
    NO_SHOW = "NO_SHOW"
}
export declare enum PaymentStatus {
    UNPAID = "UNPAID",
    PARTIAL = "PARTIAL",
    PAID = "PAID",
    REFUNDED = "REFUNDED"
}
export declare enum RoomOperationalStatus {
    AVAILABLE = "AVAILABLE",
    OCCUPIED = "OCCUPIED",
    OUT_OF_ORDER = "OUT_OF_ORDER",
    MAINTENANCE = "MAINTENANCE"
}
export declare enum HousekeepingStatus {
    CLEAN = "CLEAN",
    DIRTY = "DIRTY",
    INSPECTED = "INSPECTED",
    TOUCH_UP = "TOUCH_UP"
}
export declare enum ChannelCode {
    AGODA = "AGODA",
    BOOKING_COM = "BOOKING_COM",
    TRAVELOKA = "TRAVELOKA",
    TIKET_COM = "TIKET_COM",
    EXPEDIA = "EXPEDIA",
    DIRECT = "DIRECT"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    EDC_CARD = "EDC_CARD",
    BANK_TRANSFER = "BANK_TRANSFER",
    QRIS = "QRIS",
    VIRTUAL_ACCOUNT = "VIRTUAL_ACCOUNT",
    OTA_VIRTUAL_CARD = "OTA_VIRTUAL_CARD"
}
//# sourceMappingURL=enums.d.ts.map