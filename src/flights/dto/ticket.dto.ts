import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TicketDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    bookingId: string;
}
