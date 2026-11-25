import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PmsService } from './pms.service.js';
import { CreatePublicBookingDto } from './pms.dto.js';

@Controller('public/hotels')
export class PublicBookingController {
  constructor(private readonly pmsService: PmsService) {}

  @Get(':slug')
  async getHotelPublicProfile(@Param('slug') slug: string) {
    return this.pmsService.getPublicHotelInfo(slug);
  }

  @Post(':slug/book')
  async createPublicBooking(@Param('slug') slug: string, @Body() dto: CreatePublicBookingDto) {
    return this.pmsService.createPublicBooking(slug, dto);
  }
}
