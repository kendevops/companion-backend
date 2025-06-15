import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';

export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  wechat?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profilePictures?: string[];
}

export class SelectServicesDto {
  @IsArray()
  @ArrayMinSize(3, { message: 'You must select at least 3 services' })
  @IsUUID('4', { each: true })
  predefinedServiceIds: string[];
}

export class CreateServiceFromPredefinedDto {
  @IsUUID()
  predefinedServiceId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  price?: number;
}
