import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { PropertiesModule } from './modules/properties/properties.module.js';
import { WebSocketModule } from './modules/websocket/websocket.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { TaxModule } from './modules/tax/tax.module.js';
import { RoomTypesModule } from './modules/room-types/room-types.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { RatesModule } from './modules/rates/rates.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { FrontOfficeModule } from './modules/front-office/front-office.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ChannelManagerModule } from './modules/channels/channel-manager.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { CrmModule } from './modules/crm/crm.module.js';
import { PmsModule } from './modules/pms/pms.module.js';
import { RateLimitMiddleware, SecurityHeadersMiddleware } from './common/middleware/security.middleware.js';

@Module({
  imports: [
    AuthModule,
    PropertiesModule,
    WebSocketModule,
    InventoryModule,
    TaxModule,
    RoomTypesModule,
    RoomsModule,
    RatesModule,
    BookingsModule,
    FrontOfficeModule,
    BillingModule,
    HousekeepingModule,
    DashboardModule,
    ChannelManagerModule,
    PaymentsModule,
    CrmModule,
    PmsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}
