import { IsNotEmpty, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookFlightDto {
    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    flightOffer: any;

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    travelers: any[];
}
