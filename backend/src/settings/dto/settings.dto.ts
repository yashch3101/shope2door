import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  // Store Settings
  @IsBoolean() @IsOptional() isClosed?: boolean;
  @IsString() @IsOptional() closedMessage?: string;

  // Contact & Help
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() whatsapp?: string;
  @IsString() @IsOptional() email?: string;

  // Delivery Configurations
  @Type(() => Number) @IsNumber() @IsOptional() deliveryCharge?: number;
  @Type(() => Number) @IsNumber() @IsOptional() freeDeliveryAbove?: number;
  @Type(() => Number) @IsNumber() @IsOptional() minimumOrderAmount?: number;
}
