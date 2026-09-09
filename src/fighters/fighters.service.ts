import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FighterStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFighterDto } from './dto/create-fighter.dto';
import { UpdateFighterDto } from './dto/update-fighter.dto';

@Injectable()
export class FightersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createFighterDto: CreateFighterDto, ownerId: string) {
    return this.prisma.fighter.create({
      data: {
        ...createFighterDto,
        ownerId,
      },
    });
  }

  findAll(ownerId: string) {
    return this.prisma.fighter.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
    });
  }

  async findOne(id: string, ownerId: string) {
    const fighter = await this.prisma.fighter.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!fighter) {
      throw new NotFoundException('Fighter not found');
    }

    return fighter;
  }

  async update(id: string, ownerId: string, updateFighterDto: UpdateFighterDto) {
    const fighter = await this.findOne(id, ownerId);

    if (fighter.deletedAt) {
      throw new ConflictException('Deleted fighters cannot be updated');
    }

    const { name, nickname, weightClass, nationality, reachCm } =
      updateFighterDto;

    return this.prisma.fighter.update({
      where: { id },
      data: {
        name,
        nickname,
        weightClass,
        nationality,
        reachCm,
      },
    });
  }

  async changeStatus(
    id: string,
    ownerId: string,
    newStatus: FighterStatus,
  ): Promise<FighterStatus> {
    const fighter = await this.findOne(id, ownerId);

    if (fighter.deletedAt) {
      throw new ConflictException('Deleted fighters cannot change status');
    }

    const allowedTransitions: Record<FighterStatus, FighterStatus[]> = {
      ACTIVE: ['SUSPENDED', 'RETIRED'],
      SUSPENDED: ['ACTIVE'],
      RETIRED: ['ACTIVE'],
    };

    if (!allowedTransitions[fighter.status].includes(newStatus)) {
      throw new UnprocessableEntityException('Invalid fighter status transition');
    }

    return newStatus;
  }

  remove(id: number) {
    return `This action removes a #${id} fighter`;
  }
}
