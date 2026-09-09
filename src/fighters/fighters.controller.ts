import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/types/request-with-user';
import { FightersService } from './fighters.service';
import { CreateFighterDto } from './dto/create-fighter.dto';
import { UpdateFighterDto } from './dto/update-fighter.dto';

@Controller('fighters')
@UseGuards(JwtAuthGuard)
export class FightersController {
  constructor(private readonly fightersService: FightersService) {}

  @Post()
  create(
    @Body() createFighterDto: CreateFighterDto,
    @Req() req: RequestWithUser,
  ) {
    return this.fightersService.create(createFighterDto, req.user.id);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.fightersService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.fightersService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFighterDto: UpdateFighterDto,
    @Req() req: RequestWithUser,
  ) {
    return this.fightersService.update(id, req.user.id, updateFighterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fightersService.remove(+id);
  }
}
