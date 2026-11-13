import CustomLogo from '@/ui/field/display/application/assets/custom-logo.webp';

export const getCustomApplicationLogoUrl = () =>
  new URL(CustomLogo, window.location.href).toString();
