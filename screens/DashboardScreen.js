import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function DashboardScreen({ navigation, worker }) {
    const [conversations, setConversations] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const { colors, isDark } = useTheme();

    useEffect(() => {
        fetchConversations();
        showStressCheck();
    }, []);

    async function fetchConversations() {
        setRefreshing(true);
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?select=*&order=risk_order.desc.nullslast,last_message_time.desc.nullslast`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await res.json();
            setConversations(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Fetch error:', e);
        }
        setRefreshing(false);
    }

    async function takeCase(item) {
        const confirmed = window.confirm(`Take case for @${item.username}? You will be assigned to this youth.`);
        if (!confirmed) return;
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?chat_id=eq.${item.chat_id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({ assigned_worker: worker?.email }),
                }
            );
            fetchConversations();
        } catch (e) {
            console.error('Take case error:', e);
        }
    }

    function showStressCheck() {
        Alert.alert(
            '👋 Good morning!',
            'How are you feeling today?',
            [
                { text: '😊 Good', style: 'default' },
                { text: '😐 Okay', style: 'default' },
                { text: '😔 Struggling', onPress: () => Alert.alert('We hear you 💙', 'Please remember to take care of yourself. Reach out to your supervisor if you need support.') },
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

    const myConversations = conversations.filter(c => !c.assigned_worker);

    function renderItem({ item }) {
        const isHighRisk = item.risk_level === 'high' || item.crisis;
        const isAssignedToMe = item.assigned_worker === worker?.email;
        const isUnassigned = !item.assigned_worker;

        return (
            <View style={[styles.card, { backgroundColor: colors.card }, isHighRisk && styles.cardAlert]}>
                <TouchableOpacity
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
                            <View style={{ marginTop: 4 }}>
                                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.risk_level) }]}>
                                    <Text style={styles.riskText}>{(item.risk_level || 'unknown').toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {isUnassigned && (
                    <TouchableOpacity style={styles.takeBtn} onPress={() => takeCase(item)}>
                        <Text style={styles.takeBtnText}>+ Take Case</Text>
                    </TouchableOpacity>
                )}
                {isAssignedToMe && (
                    <View style={styles.assignedBadge}>
                        <Text style={styles.assignedText}>✓ Your case</Text>
                    </View>
                )}
            </View>
        );
    }

    const content = (
        <View style={{ flex: 1 }}>
            <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>ReachOut</Text>
                    <Text style={styles.headerSub}>Overnight conversations</Text>
                </View>
                <Image source={require('../assets/scs-logo.png')} style={styles.headerLogo} resizeMode="contain" />
            </View>

            <FlatList
                data={myConversations}
                keyExtractor={item => String(item.chat_id)}
                renderItem={renderItem}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchConversations} tintColor="#007AFF" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>🌙</Text>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No overnight conversations</Text>
                        <Text style={styles.emptySub}>Pull down to refresh</Text>
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
    header: { padding: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5 },
    headerTitle: { fontSize: 24, fontWeight: '700' },
    headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    headerLogo: { width: 40, height: 40 },
    card: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    cardAlert: { borderColor: '#FF3B30', borderWidth: 1.5 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 16, fontWeight: '700' },
    cardInfo: { flex: 1 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    displayName: { fontSize: 15, fontWeight: '700' },
    usernameSmall: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
    timeAgo: { fontSize: 12, color: '#8E8E93' },
    riskBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
    riskText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    takeBtn: { backgroundColor: '#007AFF', borderRadius: 10, padding: 8, alignItems: 'center', marginTop: 10 },
    takeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    assignedBadge: { backgroundColor: '#E5F6EC', borderRadius: 10, padding: 8, alignItems: 'center', marginTop: 10 },
    assignedText: { color: '#34C759', fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
});