import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  serviceIds: string[];
}
