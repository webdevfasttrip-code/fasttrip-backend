import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FaresDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    offerId: string;
}
