import { Module } from '@nestjs/common';
import { FightersService } from './fighters.service';
import { FightersController } from './fighters.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FightersController],
  providers: [FightersService],
})
export class FightersModule {}
