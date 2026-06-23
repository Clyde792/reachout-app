import React, { createContext, useContext, useState, useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
const ThemeContext = createContext();
export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);
    function checkTime() {
        const now = new Date();
        // Singapore is fixed UTC+8 (no daylight saving). now.getTime() is an
        // absolute instant (epoch ms) regardless of the device's own timezone,
        // so just shift it directly by 8 hours - no local offset needed.
        const sgTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const hour = sgTime.getUTCHours();
        const day = sgTime.getUTCDay();
        const isWorkingHours = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
        setIsDark(!isWorkingHours);
    }
    const theme = {
        isDark,
        colors: {
            background: isDark ? 'transparent' : '#F4F1EC',
            card: isDark ? '#1A1712' : '#FFFFFF',
            text: isDark ? '#FFFFFF' : '#1C1C1E',
            subtext: isDark ? '#8E8E93' : '#8E8E93',
            border: isDark ? '#2E2A20' : '#E5E5EA',
            primary: '#D97706',
            header: isDark ? '#251E14' : '#FFFFFF',
            input: isDark ? '#2E2A20' : '#F4F1EC',
            tabBar: isDark ? '#251E14' : '#FFFFFF',
        }
    };
    function Background({ children, style }) {
        if (isDark) {
            return (
                <LinearGradient
                    colors={['#0E0D0B', '#1A1712', '#251E14']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[{ flex: 1 }, style]}>
                    {children}
                </LinearGradient>
            );
        }
        return <View style={[{ flex: 1, backgroundColor: '#F4F1EC' }, style]}>{children}</View>;
    }
    return (
        <ThemeContext.Provider value={{ ...theme, Background }}>
            {children}
        </ThemeContext.Provider>
    );
}
export function useTheme() {
    return useContext(ThemeContext);
}