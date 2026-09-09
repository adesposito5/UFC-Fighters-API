-- CreateEnum
CREATE TYPE "WeightClass" AS ENUM ('FLYWEIGHT', 'BANTAMWEIGHT', 'FEATHERWEIGHT', 'LIGHTWEIGHT', 'WELTERWEIGHT', 'MIDDLEWEIGHT', 'LIGHT_HEAVYWEIGHT', 'HEAVYWEIGHT');

-- CreateEnum
CREATE TYPE "FighterStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateTable
CREATE TABLE "Fighter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "weightClass" "WeightClass" NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "nationality" TEXT NOT NULL,
    "status" "FighterStatus" NOT NULL DEFAULT 'ACTIVE',
    "reachCm" INTEGER,
    "ownerId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fighter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspensionRecord" (
    "id" TEXT NOT NULL,
    "fighterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuspensionRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SuspensionRecord" ADD CONSTRAINT "SuspensionRecord_fighterId_fkey" FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
