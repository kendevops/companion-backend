import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class ServiceTemplateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  recommendedPrice: number;

  @IsString()
  @IsNotEmpty()
  category: string;
}
