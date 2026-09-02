import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AddressService } from './address.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
  ) {}

  // =====================================================
  // GET ALL ADDRESSES
  // GET /api/v1/addresses
  // =====================================================

  @Get()
  async getAddresses(
    @CurrentUser('id') userId: string,
  ) {
    const data =
      await this.addressService.getAddresses(
        userId,
      );

    return {
      success: true,
      message: 'Addresses fetched successfully',
      data,
    };
  }

  // =====================================================
  // GET SINGLE ADDRESS
  // GET /api/v1/addresses/:id
  // =====================================================

  @Get(':id')
  async getAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    const data =
      await this.addressService.getAddress(
        userId,
        addressId,
      );

    return {
      success: true,
      message: 'Address fetched successfully',
      data,
    };
  }

  // =====================================================
  // CREATE ADDRESS
  // POST /api/v1/addresses
  // =====================================================

  @Post()
  async createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    const data =
      await this.addressService.createAddress(
        userId,
        dto,
      );

    return {
      success: true,
      message: 'Address created successfully',
      data,
    };
  }

  // =====================================================
  // UPDATE ADDRESS
  // PATCH /api/v1/addresses/:id
  // =====================================================

  @Patch(':id')
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const data =
      await this.addressService.updateAddress(
        userId,
        addressId,
        dto,
      );

    return {
      success: true,
      message: 'Address updated successfully',
      data,
    };
  }

  // =====================================================
  // SET DEFAULT ADDRESS
  // PATCH /api/v1/addresses/:id/default
  // =====================================================

  @Patch(':id/default')
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    const data =
      await this.addressService.setDefaultAddress(
        userId,
        addressId,
      );

    return {
      success: true,
      message: 'Default address updated successfully',
      data,
    };
  }

  // =====================================================
  // DELETE ADDRESS
  // DELETE /api/v1/addresses/:id
  // =====================================================

  @Delete(':id')
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    const data =
      await this.addressService.deleteAddress(
        userId,
        addressId,
      );

    return {
      success: true,
      message: 'Address deleted successfully',
      data,
    };
  }
}