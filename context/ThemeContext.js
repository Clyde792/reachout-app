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
            background: isDark ? 'transparent' : '#F2F2F7',
            card: isDark ? '#1A1A2E' : '#FFFFFF',
            text: isDark ? '#FFFFFF' : '#1C1C1E',
            subtext: isDark ? '#8E8E93' : '#8E8E93',
            border: isDark ? '#2D2D44' : '#E5E5EA',
            primary: '#007AFF',
            header: isDark ? '#16213E' : '#FFFFFF',
            input: isDark ? '#2D2D44' : '#F2F2F7',
            tabBar: isDark ? '#16213E' : '#FFFFFF',
        }
    };
    function Background({ children, style }) {
        if (isDark) {
            return (
                <LinearGradient
                    colors={['#0D0D1A', '#1A1A2E', '#16213E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[{ flex: 1 }, style]}>
                    {children}
                </LinearGradient>
            );
        }
        return <View style={[{ flex: 1, backgroundColor: '#F2F2F7' }, style]}>{children}</View>;
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