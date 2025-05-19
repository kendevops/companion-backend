import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ContactDetailsDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  wechat?: string;
}

export class SellerProfileDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  profilePictures: string[];

  @ValidateNested()
  @Type(() => ContactDetailsDto)
  contactDetails: ContactDetailsDto;
}
