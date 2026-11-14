import React from 'react';

interface ThemeSwitchProps {
  isNight: boolean;
  onToggleNight: () => void;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ isNight, onToggleNight }) => {
  return (
    <label htmlFor="theme-switch" className="theme-switch" title={isNight ? 'Beralih ke Mode Siang' : 'Beralih ke Mode Malam'}>
      <input
        id="theme-switch"
        type="checkbox"
        checked={!isNight}
        onChange={onToggleNight}
        aria-label={isNight ? 'Mode Malam Aktif' : 'Mode Siang Aktif'}
      />
      <span className="slider" />
      <span className="decoration" />
    </label>
  );
};
