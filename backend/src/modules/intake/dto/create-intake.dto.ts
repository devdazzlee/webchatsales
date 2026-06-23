import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateIntakeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  ownerPhone?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(255)
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  servicesOffered: string[];

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  businessHours: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  timezone: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(255)
  bookingLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  jobDescription?: string;
}
