import { IsBoolean } from 'class-validator';

export class CompleteOnboardingDto {
  @IsBoolean()
  completed: boolean;
}
