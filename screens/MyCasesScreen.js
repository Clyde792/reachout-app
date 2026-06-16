import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function MyCasesScreen({ navigation, worker }) {
    const [cases, setCases] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const { colors, isDark } = useTheme();

    useEffect(() => {
        fetchMyCases();
    }, []);

    async function fetchMyCases() {
        setRefreshing(true);
        try {
            const email = worker?.email;
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?select=*&assigned_worker=eq.${encodeURIComponent(email)}&order=risk_order.desc.nullslast,last_message_time.desc.nullslast`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await res.json();
            setCases(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
        setRefreshing(false);
    }

    function getRiskColor(level) {
        if (level === 'high') return '#FF3B30';
        if (level === 'medium') return '#FF9500';
        return '#34C759';
    }

    function getTimeAgo(time) {
        if (!time) return '';
        const diff = Math.floor((new Date() - new Date(time)) / 60000);
        if (diff < 1) return 'just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return `${Math.floor(diff / 1440)}d ago`;
    }

    function getInitials(username) {
        if (!username) return '?';
        return username.slice(0, 2).toUpperCase();
    }

    function renderItem({ item }) {
        const isHighRisk = item.risk_level === 'high' || item.crisis;
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card }, isHighRisk && styles.cardAlert]}
                onPress={() => navigation.navigate('YouthProfile', { conversation: item, worker })}>

                <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: isHighRisk ? '#FFE5E5' : '#E5F1FF' }]}>
                        <Text style={[styles.avatarText, { color: isHighRisk ? '#FF3B30' : '#007AFF' }]}>
                            {getInitials(item.username)}
                        </Text>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.cardRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>{item.display_name || item.username || 'Unknown'}</Text>
                                <Text style={styles.usernameSmall} numberOfLines={1}>@{item.username || ''}</Text>
                            </View>
                            <Text style={styles.timeAgo}>{getTimeAgo(item.last_message_time)}</Text>
                        </View>
                        <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.risk_level) }]}>
                                <Text style={styles.riskText}>{(item.risk_level || 'unknown').toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.progressSection}>
                    <View style={styles.moodRow}>
                        <Text style={styles.moodEmoji}>😢</Text>
                        <View style={styles.moodTrack}>
                            <View style={[styles.moodFill, {
                                width: `${item.mood_score || 50}%`,
                                backgroundColor: item.mood_score >= 60 ? '#34C759' : item.mood_score >= 40 ? '#FF9500' : '#FF3B30'
                            }]} />
                        </View>
                        <Text style={styles.moodEmoji}>😊</Text>
                        <Text style={styles.moodScore}>{item.mood_score || 50}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    const content = (
        <View style={{ flex: 1 }}>
            <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Cases</Text>
                <Text style={styles.headerSub}>{cases.length} youth{cases.length !== 1 ? 's' : ''} assigned to you</Text>
            </View>

            <FlatList
                data={cases}
                keyExtractor={item => String(item.chat_id)}
                renderItem={renderItem}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchMyCases} tintColor="#007AFF" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>📋</Text>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No cases yet</Text>
                        <Text style={styles.emptySub}>Go to Home to claim unassigned youths</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
            />
        </View>
    );

    if (isDark) {
        return (
            <LinearGradient
                colors={['#0D0D1A', '#1A1A2E', '#16213E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}>
                {content}
            </LinearGradient>
        );
    }

    return <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>{content}</View>;
}

const styles = StyleSheet.create({
    header: { padding: 20, paddingTop: 16, borderBottomWidth: 0.5 },
    headerTitle: { fontSize: 24, fontWeight: '700' },
    headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    card: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    cardAlert: { borderColor: '#FF3B30', borderWidth: 1.5 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 16, fontWeight: '700' },
    cardInfo: { flex: 1 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    timeAgo: { fontSize: 12, color: '#8E8E93' },
    riskBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
    riskText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
    displayName: { fontSize: 15, fontWeight: '700' },
    usernameSmall: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
    progressSection: { borderTopWidth: 0.5, borderTopColor: '#2D2D44', paddingTop: 10, marginBottom: 8 },
    moodRow: { flexDirection: 'row', alignItems: 'center' },
    moodEmoji: { fontSize: 16 },
    moodTrack: { flex: 1, height: 6, backgroundColor: '#3A3A3C', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
    moodFill: { height: 6, borderRadius: 3 },
    moodScore: { fontSize: 11, color: '#8E8E93', width: 24, textAlign: 'right' },
});