import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class CreateVisaPlanDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  entryType?: string;

  @IsOptional()
  @IsString()
  validity?: string;

  @IsOptional()
  @IsString()
  stayDuration?: string;

  @IsOptional()
  @IsString()
  visaType?: string;

  @IsNumber()
  visaFee: number;

  @IsNumber()
  serviceFee: number;

  @IsNumber()
  totalFee: number;

  @IsOptional()
  @IsNumber()
  childVisaFee?: number;

  @IsOptional()
  @IsNumber()
  childServiceFee?: number;

  @IsOptional()
  @IsNumber()
  childTotalFee?: number;

  @IsOptional()
  @IsNumber()
  processingDays?: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateVisaRequirementDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateVisaFAQDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateVisaSEOContentDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  sectionTitle: string;

  @IsString()
  sectionContent: string;

  @IsOptional()
  @IsString()
  sectionType?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateVisaCountryDto {
  @IsString()
  countryName: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  flagUrl?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  metaKeywords?: string;

  @IsOptional()
  formFields?: any;

  @IsOptional()
  @IsString()
  visaType?: string;

  @IsOptional()
  @IsString()
  processingTime?: string;

  @IsOptional()
  @IsString()
  stayDuration?: string;

  @IsOptional()
  @IsString()
  validity?: string;

  @IsOptional()
  @IsNumber()
  startingPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVisaPlanDto)
  plans?: CreateVisaPlanDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVisaRequirementDto)
  requirements?: CreateVisaRequirementDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVisaFAQDto)
  faqs?: CreateVisaFAQDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVisaSEOContentDto)
  seoContent?: CreateVisaSEOContentDto[];
}

export class UpdateVisaCountryDto extends PartialType(CreateVisaCountryDto) {}
