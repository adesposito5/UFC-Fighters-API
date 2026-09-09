import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FightersModule } from './fighters/fighters.module';

@Module({
  imports: [AuthModule, FightersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
