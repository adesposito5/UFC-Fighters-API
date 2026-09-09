import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FightersService } from './fighters.service';

describe('FightersService', () => {
  let service: FightersService;
  let prismaMock: {
    fighter: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    suspensionRecord: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      fighter: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      suspensionRecord: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prismaMock.$transaction.mockImplementation(
      (callback: (transaction: typeof prismaMock) => unknown) =>
        callback(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FightersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<FightersService>(FightersService);
  });

  it('throws 422 without starting a transaction when suspending without a reason', async () => {
    prismaMock.fighter.findFirst.mockResolvedValue({
      id: 'fighter-1',
      ownerId: 'owner-1',
      status: 'ACTIVE',
      deletedAt: null,
    });

    await expect(
      service.changeStatus('fighter-1', 'owner-1', 'SUSPENDED'),
    ).rejects.toMatchObject({ status: 422 });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.fighter.update).not.toHaveBeenCalled();
    expect(prismaMock.suspensionRecord.create).not.toHaveBeenCalled();
  });

  it('updates the fighter and creates an open suspension record', async () => {
    const updatedFighter = {
      id: 'fighter-1',
      ownerId: 'owner-1',
      status: 'SUSPENDED',
      deletedAt: null,
    };
    prismaMock.fighter.findFirst.mockResolvedValue({
      ...updatedFighter,
      status: 'ACTIVE',
    });
    prismaMock.fighter.update.mockResolvedValue(updatedFighter);

    await expect(
      service.changeStatus(
        'fighter-1',
        'owner-1',
        'SUSPENDED',
        'medical suspension',
      ),
    ).resolves.toEqual(updatedFighter);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.fighter.update).toHaveBeenCalledWith({
      where: { id: 'fighter-1' },
      data: { status: 'SUSPENDED' },
    });
    expect(prismaMock.suspensionRecord.create).toHaveBeenCalledWith({
      data: {
        fighterId: 'fighter-1',
        reason: 'medical suspension',
        suspendedAt: expect.any(Date),
        liftedAt: null,
      },
    });
  });

  it('closes the active suspension record without deleting it when reactivating', async () => {
    const activeSuspension = {
      id: 'suspension-1',
      fighterId: 'fighter-1',
      reason: 'medical suspension',
      suspendedAt: new Date('2026-01-01'),
      liftedAt: null,
    };
    prismaMock.fighter.findFirst.mockResolvedValue({
      id: 'fighter-1',
      ownerId: 'owner-1',
      status: 'SUSPENDED',
      deletedAt: null,
    });
    prismaMock.fighter.update.mockResolvedValue({
      id: 'fighter-1',
      ownerId: 'owner-1',
      status: 'ACTIVE',
      deletedAt: null,
    });
    prismaMock.suspensionRecord.findFirst.mockResolvedValue(activeSuspension);

    await service.changeStatus('fighter-1', 'owner-1', 'ACTIVE');

    expect(prismaMock.suspensionRecord.findFirst).toHaveBeenCalledWith({
      where: { fighterId: 'fighter-1', liftedAt: null },
    });
    expect(prismaMock.suspensionRecord.update).toHaveBeenCalledWith({
      where: { id: 'suspension-1' },
      data: { liftedAt: expect.any(Date) },
    });
    expect(prismaMock.suspensionRecord.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['ACTIVE', 'ACTIVE'],
    ['RETIRED', 'SUSPENDED'],
  ] as const)(
    'throws 422 for invalid transition %s -> %s',
    async (status, newStatus) => {
      prismaMock.fighter.findFirst.mockResolvedValue({
        id: 'fighter-1',
        ownerId: 'owner-1',
        status,
        deletedAt: null,
      });

      await expect(
        service.changeStatus('fighter-1', 'owner-1', newStatus),
      ).rejects.toMatchObject({ status: 422 });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it('throws 409 before changing a deleted fighter status', async () => {
    prismaMock.fighter.findFirst.mockResolvedValue({
      id: 'fighter-1',
      ownerId: 'owner-1',
      status: 'ACTIVE',
      deletedAt: new Date(),
    });

    await expect(
      service.changeStatus('fighter-1', 'owner-1', 'SUSPENDED', 'reason'),
    ).rejects.toMatchObject({ status: 409 });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
