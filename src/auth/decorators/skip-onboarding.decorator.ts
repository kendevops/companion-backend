import { SetMetadata } from '@nestjs/common';

export const SKIP_ONBOARDING_KEY = 'skipOnboardingCheck';
export const SkipOnboardingCheck = () => SetMetadata(SKIP_ONBOARDING_KEY, true);
