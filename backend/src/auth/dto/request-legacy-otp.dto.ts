import {
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

export class RequestLegacyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone: string;
}