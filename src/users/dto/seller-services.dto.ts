import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServiceDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean = true;
}

export class SellerServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  @ArrayMinSize(3)
  services: ServiceDto[];
}
