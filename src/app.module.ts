import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FightersModule } from './fighters/fighters.module';

@Module({
  imports: [FightersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
