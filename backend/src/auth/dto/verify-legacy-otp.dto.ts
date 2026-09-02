import {
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

export class VerifyLegacyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be a 6-digit number',
  })
  otp: string;
}