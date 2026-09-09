import {
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsPositive,
	IsString,
} from 'class-validator';
import { WeightClass } from '../../generated/prisma/enums';

export class CreateFighterDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsOptional()
	@IsString()
	nickname?: string;

	@IsEnum(WeightClass)
	weightClass: WeightClass;

	@IsString()
	@IsNotEmpty()
	nationality: string;

	@IsOptional()
	@IsInt()
	@IsPositive()
	reachCm?: number;
}
