import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Phone number must be a valid 10-digit Indian mobile number',
  })
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
