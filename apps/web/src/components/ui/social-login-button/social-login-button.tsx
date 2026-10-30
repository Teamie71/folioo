import type { ComponentProps } from 'react';
import { KakaoIcon, NaverIcon } from '@/components/icons';
import { Button } from '../button';
import { PrefixIcon } from '../icon';
import { socialLoginButton } from './social-login-button.css';
import { vars } from '@folioo/bud-tokens';

const socialTypes = {
  kakao: {
    size: 20,
    label: '카카오로 로그인',
    iconColor: vars.color.icon.strong,
    Logo: KakaoIcon,
  },
  naver: {
    size: 18,
    label: '네이버로 로그인',
    iconColor: vars.color.icon.inverse,
    Logo: NaverIcon,
  },
};

export type SocialLoginButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  socialType: keyof typeof socialTypes;
};

export function SocialLoginButton({ socialType, className, ...props }: SocialLoginButtonProps) {
  const { size, label, iconColor, Logo } = socialTypes[socialType];
  return (
    <Button
      {...props}
      variant="social"
      layout="withText"
      className={[socialLoginButton({ socialType }), className].filter(Boolean).join(' ')}
    >
      <PrefixIcon size={size} color={iconColor} svg={<Logo />} />
      {label}
    </Button>
  );
}
