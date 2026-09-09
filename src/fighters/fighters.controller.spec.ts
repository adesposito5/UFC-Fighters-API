import { Test, TestingModule } from '@nestjs/testing';
import { FightersController } from './fighters.controller';
import { FightersService } from './fighters.service';

describe('FightersController', () => {
  let controller: FightersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FightersController],
      providers: [FightersService],
    }).compile();

    controller = module.get<FightersController>(FightersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
