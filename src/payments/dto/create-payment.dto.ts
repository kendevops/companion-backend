import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  purchaseId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
