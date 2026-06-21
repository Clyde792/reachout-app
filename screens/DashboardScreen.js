import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, Clock, Users, UserPlus, ChevronRight, Heart, X } from 'lucide-react-native';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

const MOODS = [
    { key: 'good', label: 'Good' },
    { key: 'okay', label: 'Okay' },
    { key: 'not_great', label: 'Not great' },
];

export default function DashboardScreen({ navigation, worker }) {
    const [conversations, setConversations] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const { colors, isDark } = useTheme();

    const [showWellbeing, setShowWellbeing] = useState(false);
    const [wellbeingSaving, setWellbeingSaving] = useState(false);
    const [showSupportNote, setShowSupportNote] = useState(false);

    useEffect(() => {
        checkWellbeingPrompt();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [])
    );

    async function checkWellbeingPrompt() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const lastShown = await AsyncStorage.getItem('wellbeing_last_shown');
            if (lastShown !== today) {
                setShowWellbeing(true);
            }
        } catch (e) {
            console.error('Wellbeing check error:', e);
        }
    }

    async function answerWellbeing(moodKey) {
        setWellbeingSaving(true);
        try {
            const today = new Date().toISOString().slice(0, 10);
            await AsyncStorage.setItem('wellbeing_last_shown', today);

            await fetch(`${SUPABASE_URL}/rest/v1/worker_wellbeing`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify({ worker_email: worker?.email, mood: moodKey }),
            });

            if (moodKey === 'not_great') {
                await checkRecentNotGreatStreak();
            }

            setShowWellbeing(false);
        } catch (e) {
            console.error('Save wellbeing error:', e);
            setShowWellbeing(false);
        }
        setWellbeingSaving(false);
    }

    async function checkRecentNotGreatStreak() {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_wellbeing?worker_email=eq.${encodeURIComponent(worker?.email)}&mood=eq.not_great&created_at=gte.${sevenDaysAgo}&select=id`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 3) {
                setShowSupportNote(true);
            }
        } catch (e) {
            console.error('Streak check error:', e);
        }
    }

    async function dismissWellbeing() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            await AsyncStorage.setItem('wellbeing_last_shown', today);
        } catch (e) { }
        setShowWellbeing(false);
    }

    async function fetchConversations() {
        setRefreshing(true);
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?select=*&assigned_worker=is.null&order=last_message_time.desc.nullslast`,
                { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            const sorted = Array.isArray(data) ? sortByRisk(data) : [];
            setConversations(sorted);
        } catch (e) {
            console.error('Fetch error:', e);
        }
        setRefreshing(false);
    }

    function sortByRisk(list) {
        const riskScore = { high: 3, medium: 2, low: 1 };
        return [...list].sort((a, b) => {
            const aCrisis = a.crisis ? 1 : 0;
            const bCrisis = b.crisis ? 1 : 0;
            if (aCrisis !== bCrisis) return bCrisis - aCrisis;
            const aScore = riskScore[a.risk_level] || 0;
            const bScore = riskScore[b.risk_level] || 0;
            return bScore - aScore;
        });
    }

    async function takeCase(item) {
        Alert.alert(
            'Take Case',
            `Assign @${item.username} to yourself?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm', onPress: async () => {
                        try {
                            await fetch(
                                `${SUPABASE_URL}/rest/v1/conversations?chat_id=eq.${item.chat_id}`,
                                {
                                    method: 'PATCH',
                                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                                    body: JSON.stringify({ assigned_worker: worker?.email }),
                                }
                            );
                            fetchConversations();
                        } catch (e) {
                            console.error('Take case error:', e);
                        }
                    }
                },
            ]
        );
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
        const isAssigned = !!item.assigned_worker;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card }, isHighRisk && styles.cardAlert]}
                onPress={() => navigation.navigate('YouthProfile', { conversation: item, worker, limitedView: true })}>

                <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: isHighRisk ? '#FFE5E5' : '#E5F1FF' }]}>
                        <Text style={[styles.avatarText, { color: isHighRisk ? '#FF3B30' : '#007AFF' }]}>
                            {getInitials(item.username)}
                        </Text>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.cardRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                                    {item.display_name || item.username || 'Unknown'}
                                </Text>
                                <Text style={styles.usernameSmall} numberOfLines={1}>@{item.username || ''}</Text>
                            </View>
                            <View style={styles.timeRow}>
                                <Clock size={11} color="#8E8E93" />
                                <Text style={styles.timeAgo}>{getTimeAgo(item.last_message_time)}</Text>
                            </View>
                        </View>

                        <View style={styles.badgeRow}>
                            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.risk_level) }]}>
                                {isHighRisk && <AlertTriangle size={9} color="#fff" style={{ marginRight: 3 }} />}
                                <Text style={styles.riskText}>{(item.risk_level || 'unknown').toUpperCase()}</Text>
                            </View>
                            {isAssigned ? (
                                <View style={styles.assignedBadge}>
                                    <Users size={9} color="#007AFF" />
                                    <Text style={styles.assignedText}>Assigned</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.takeCaseBtn} onPress={() => takeCase(item)}>
                                    <UserPlus size={10} color="#fff" />
                                    <Text style={styles.takeCaseText}>Take Case</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <ChevronRight size={16} color="#C7C7CC" />
                </View>

                {item.snapshot ? (
                    <Text style={[styles.snapshot, { color: colors.subtext }]} numberOfLines={2}>{item.snapshot}</Text>
                ) : item.last_message ? (
                    <Text style={[styles.snapshot, { color: colors.subtext }]} numberOfLines={2}>{item.last_message}</Text>
                ) : null}
            </TouchableOpacity>
        );
    }

    const highRisk = conversations.filter(c => c.risk_level === 'high' || c.crisis).length;
    const unassigned = conversations.filter(c => !c.assigned_worker).length;

    const content = (
        <View style={{ flex: 1 }}>
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <Image source={require('../assets/scs-logo.png')} style={styles.logo} resizeMode="contain" />
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
                    <Text style={styles.headerSub}>Welcome, {worker?.email?.split('@')[0] || 'Worker'}</Text>
                </View>
            </SafeAreaView>

            {showWellbeing && (
                <View style={[styles.wellbeingBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.wellbeingTop}>
                        <View style={styles.wellbeingTitleRow}>
                            <Heart size={15} color="#FF6B81" />
                            <Text style={[styles.wellbeingTitle, { color: colors.text }]}>How are you feeling today?</Text>
                        </View>
                        <TouchableOpacity onPress={dismissWellbeing} style={styles.dismissBtn}>
                            <X size={16} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.moodRow}>
                        {MOODS.map(m => (
                            <TouchableOpacity
                                key={m.key}
                                style={[styles.moodBtn, { backgroundColor: colors.input }]}
                                onPress={() => answerWellbeing(m.key)}
                                disabled={wellbeingSaving}>
                                <Text style={[styles.moodBtnText, { color: colors.text }]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {showSupportNote && (
                <View style={styles.supportNote}>
                    <Heart size={14} color="#FF6B81" />
                    <Text style={styles.supportNoteText}>
                        You've reported feeling low a few times this week. Please consider reaching out to your supervisor or HR for support — your wellbeing matters too.
                    </Text>
                    <TouchableOpacity onPress={() => setShowSupportNote(false)}>
                        <X size={14} color="#8E8E93" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={[styles.statsRow, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: colors.text }]}>{conversations.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: '#FF3B30' }]}>{highRisk}</Text>
                    <Text style={styles.statLabel}>High Risk</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: '#FF9500' }]}>{unassigned}</Text>
                    <Text style={styles.statLabel}>Unassigned</Text>
                </View>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={item => String(item.chat_id)}
                renderItem={renderItem}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchConversations} tintColor="#007AFF" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Users size={48} color="#C7C7CC" />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
                        <Text style={styles.emptySub}>Youths who message the bot will appear here</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5 },
    logo: { width: 36, height: 36 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 1 },
    wellbeingBanner: { margin: 16, marginBottom: 0, borderRadius: 14, padding: 14, borderWidth: 1 },
    wellbeingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    wellbeingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    wellbeingTitle: { fontSize: 14, fontWeight: '600' },
    dismissBtn: { padding: 2 },
    moodRow: { flexDirection: 'row', gap: 8 },
    moodBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
    moodBtnText: { fontSize: 13, fontWeight: '600' },
    supportNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 16, marginBottom: 0, backgroundColor: 'rgba(255,107,129,0.1)', borderRadius: 12, padding: 12 },
    supportNoteText: { flex: 1, fontSize: 12, color: '#FF6B81', lineHeight: 17 },
    statsRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, marginTop: 12 },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '700' },
    statLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
    statDivider: { width: 0.5 },
    card: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    cardAlert: { borderColor: '#FF3B30', borderWidth: 1.5 },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 16, fontWeight: '700' },
    cardInfo: { flex: 1 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    timeAgo: { fontSize: 12, color: '#8E8E93' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    riskBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, flexDirection: 'row', alignItems: 'center' },
    riskText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#E5F1FF' },
    assignedText: { fontSize: 9, color: '#007AFF', fontWeight: '600' },
    takeCaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#34C759' },
    takeCaseText: { fontSize: 9, color: '#fff', fontWeight: '600' },
    snapshot: { fontSize: 13, marginTop: 8, lineHeight: 18 },
    displayName: { fontSize: 15, fontWeight: '700' },
    usernameSmall: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub: { fontSize: 14, color: '#8E8E93' },
});