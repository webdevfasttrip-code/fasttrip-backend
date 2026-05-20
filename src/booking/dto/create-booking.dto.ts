import { IsString, IsEmail, IsNumber, IsArray, ValidateNested, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PassengerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'Mr' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'MALE' })
  @IsString()
  gender: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsString()
  dateOfBirth: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  documents?: any[];

  @ApiProperty({ example: 'ADULT' })
  @IsString()
  @IsOptional()
  type?: string;
}

class GstDetailsDto {
  @ApiProperty({ example: '07AAAAA0000A1Z5' })
  @IsString()
  gstNumber: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  companyName: string;

  @ApiProperty({ example: '123 Business St, Delhi' })
  @IsString()
  address: string;
}

export class CreateBookingDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ example: '+919999999999' })
  @IsString()
  contactPhone: string;

  @ApiProperty({ example: 'contact@example.com' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ type: GstDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GstDetailsDto)
  gstDetails?: GstDetailsDto;

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiProperty({ description: 'Raw flight offer from supplier' })
  @IsObject()
  rawOffer: any;

  @ApiPropertyOptional({ description: 'Passenger count breakdown' })
  @IsOptional()
  @IsObject()
  passengerCount?: { adult: number, child: number, infant: number };

  @ApiPropertyOptional({ description: 'Enriched flight data for display' })
  @IsOptional()
  @IsObject()
  selectedFlightData?: any;

  @ApiPropertyOptional({ example: 'AMADEUS' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  supplierOfferId?: string;

  @ApiPropertyOptional({ description: 'Selected fare family details' })
  @IsOptional()
  @IsObject()
  selectedFareOption?: any;

  @ApiPropertyOptional({ description: 'Selected add-ons (bags, seats, etc)' })
  @IsOptional()
  @IsArray()
  selectedAddOns?: any[];

  @ApiPropertyOptional({ description: 'Technical pricing capture' })
  @IsOptional()
  @IsObject()
  pricingSnapshot?: any;
}
