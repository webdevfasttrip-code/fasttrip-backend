import { IsString, IsISO8601, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TravelClass {
    ECONOMY = 'ECONOMY',
    PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
    BUSINESS = 'BUSINESS',
    FIRST = 'FIRST',
}

export class SearchFlightDto {
    @ApiProperty({ example: 'DEL', description: 'Origin airport IATA code' })
    @IsString()
    origin: string;

    @ApiProperty({ example: 'BOM', description: 'Destination airport IATA code' })
    @IsString()
    destination: string;

    @ApiProperty({ example: '2026-04-01', description: 'Departure date (ISO 8601)' })
    @IsISO8601()
    departureDate: string;

    @ApiPropertyOptional({ example: '2026-04-05', description: 'Return date (ISO 8601)' })
    @IsOptional()
    @IsISO8601()
    returnDate?: string;

    @ApiProperty({ example: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    adults: number;

    @ApiPropertyOptional({ enum: TravelClass, default: TravelClass.ECONOMY })
    @IsOptional()
    @IsEnum(TravelClass)
    travelClass?: TravelClass;

    @ApiPropertyOptional({ example: 0, default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    children?: number;

    @ApiPropertyOptional({ example: 0, default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    infants?: number;

    @ApiPropertyOptional({ example: 'Economy' })
    @IsOptional()
    @IsString()
    cabin?: string;
}
