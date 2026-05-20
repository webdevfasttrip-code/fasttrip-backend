import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LockFareDto {
    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    flightOffer: any;
}
