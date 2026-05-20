import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelRequestDto {
  @ApiProperty({ description: 'Reason for cancellation Request', example: 'Plans changed due to emergency.' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
