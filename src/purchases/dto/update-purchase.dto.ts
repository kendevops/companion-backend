import { IsOptional, IsEnum } from 'class-validator';

enum PurchaseStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class UpdatePurchaseDto {
  @IsEnum(PurchaseStatus)
  @IsOptional()
  status?: PurchaseStatus;
}
