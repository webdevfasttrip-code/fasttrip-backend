import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManageBookingDto {
    @ApiProperty({ example: 'FTAA1234' })
    @IsString()
    bookingRef: string;

    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;
}
