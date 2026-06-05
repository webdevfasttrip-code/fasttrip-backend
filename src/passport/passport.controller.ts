import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PassportService } from './passport.service';

@Controller('passport')
export class PassportController {
  constructor(private readonly passportService: PassportService) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('passportFile'))
  async extractPassport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Passport file is required');
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPG, PNG, and PDF are allowed.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    const extractedData = await this.passportService.processPassport(file.buffer, file.mimetype, file.originalname, file.size);

    if ((extractedData as any).success === false) {
      return extractedData; // Return the exact error object as requested by user
    }

    return {
      success: true,
      data: extractedData
    };
  }
}
