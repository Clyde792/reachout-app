import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, TextInput, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, Clock, Repeat, Check, X, Search } from 'lucide-react-native';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';
const BOT_URL = 'https://bot.lanternscs.org';
const API_KEY = '73d80519c6fba42e';

const RISK_FILTERS = [
    { key: 'all', label: 'All', color: null },
    { key: 'high', label: 'High', color: '#FF3B30' },
    { key: 'medium', label: 'Medium', color: '#FF9500' },
    { key: 'low', label: 'Low', color: '#34C759' },
];

export default function MyCasesScreen({ navigation, worker }) {
    const [cases, setCases] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [allSentHistory, setAllSentHistory] = useState([]);
    const [respondingId, setRespondingId] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [workerNames, setWorkerNames] = useState({});
    const [acceptedInfo, setAcceptedInfo] = useState(null);
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const { colors, isDark } = useTheme();

    useFocusEffect(
        useCallback(() => {
            fetchMyCases();
            fetchPendingRequests();
            fetchSentRequests();
            fetchAllSentHistory();
            fetchWorkerNames();
        }, [])
    );

    async function fetchWorkerNames() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_profiles?select=email,name`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            if (Array.isArray(data)) {
                const map = {};
                data.forEach(w => { map[w.email] = w.name; });
                setWorkerNames(map);
            }
        } catch (e) {
            console.error('Fetch worker names error:', e);
        }
    }

    async function attachConversations(data) {
        if (!Array.isArray(data) || data.length === 0) return [];
        const chatIds = [...new Set(data.map(r => r.chat_id))];
        const convRes = await fetch(
            `${SUPABASE_URL}/rest/v1/conversations?chat_id=in.(${chatIds.join(',')})&select=*`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const convData = await convRes.json();
        return data.map(req => ({
            ...req,
            conversation: Array.isArray(convData) ? convData.find(c => c.chat_id === req.chat_id) : null,
        }));
    }

    async function fetchFullConversation(chatId) {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?chat_id=eq.${chatId}&select=*`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            return Array.isArray(data) && data[0] ? data[0] : null;
        } catch (e) {
            console.error('Fetch full conversation error:', e);
            return null;
        }
    }

    async function fetchMyCases() {
        try {
            const email = worker?.email;
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?select=*&assigned_worker=eq.${encodeURIComponent(email)}&order=last_message_time.desc.nullslast`,
                { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            const sorted = Array.isArray(data) ? sortByRisk(data) : [];
            setCases(sorted);
        } catch (e) {
            console.error(e);
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

    async function fetchPendingRequests() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/handover_requests?to_worker=eq.${encodeURIComponent(worker?.email)}&status=eq.pending&select=*&order=created_at.desc`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            const merged = await attachConversations(data);
            setPendingRequests(merged);
        } catch (e) {
            console.error('Fetch pending requests error:', e);
        }
    }

    async function fetchSentRequests() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/handover_requests?from_worker=eq.${encodeURIComponent(worker?.email)}&status=eq.pending&select=*&order=created_at.desc`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            const merged = await attachConversations(data);
            setSentRequests(merged);
        } catch (e) {
            console.error('Fetch sent requests error:', e);
        }
    }

    async function fetchAllSentHistory() {
        try {
            // Drive "Handed Over" off the live conversation, not the append-only
            // case_history log. A case shows here only while I'm the worker who
            // handed it to its *current* holder (conversations.handover_from).
            // Once it's passed on again, handover_from changes and it drops off
            // this list automatically — no stale duplicates.
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?handover_from=eq.${encodeURIComponent(worker?.email)}&select=chat_id,username,display_name,risk_level,crisis,assigned_worker,mood_score,handover_at&order=handover_at.desc.nullslast`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            const merged = (Array.isArray(data) ? data : [])
                .filter(c => c.assigned_worker !== worker?.email) // exclude any that came back to me
                .map(c => ({ id: c.chat_id, conversation: c }));
            setAllSentHistory(merged);
        } catch (e) {
            console.error('Fetch sent history error:', e);
        }
    }

    async function respondToRequest(request, accept) {
        setRespondingId(request.id);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/handover_requests?id=eq.${request.id}`, {
                method: 'PATCH',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() }),
            });

            if (accept) {
                await fetch(`${SUPABASE_URL}/rest/v1/conversations?chat_id=eq.${request.chat_id}`, {
                    method: 'PATCH',
                    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                    body: JSON.stringify({
                        assigned_worker: worker?.email,
                        handover_from: request.from_worker,
                        handover_at: new Date().toISOString(),
                        previously_assigned_to: request.from_worker,
                    }),
                });

                await fetch(`${SUPABASE_URL}/rest/v1/case_history`, {
                    method: 'POST',
                    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                    body: JSON.stringify({
                        chat_id: request.chat_id,
                        worker_email: request.from_worker,
                        role: 'previous_worker',
                    }),
                });

                // Let the youth know (via the bot) that someone new who cares is
                // now also there for them. Best-effort, non-blocking.
                const newWorkerName = workerNames[worker?.email] || worker?.email?.split('@')[0] || 'Someone';
                fetch(`${BOT_URL}/handover-intro`, {
                    method: 'POST',
                    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: request.chat_id, workerName: newWorkerName }),
                }).catch(e => console.error('Handover intro notify error:', e));

                const fullConv = await fetchFullConversation(request.chat_id);
                setAcceptedInfo({
                    youthName: request.conversation?.display_name || request.conversation?.username || 'this youth',
                    fromWorkerName: workerNames[request.from_worker] || request.from_worker,
                    note: request.note,
                    conversation: fullConv || request.conversation,
                });
            }

            await fetchPendingRequests();
            await fetchMyCases();
        } catch (e) {
            console.error('Respond to request error:', e);
        }
        setRespondingId(null);
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

    // Filter a case by the search box (matches display name or @username).
    function matchesSearch(c) {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (c?.display_name || '').toLowerCase().includes(q)
            || (c?.username || '').toLowerCase().includes(q);
    }

    // Filter a case by the selected risk level (High / Medium / Low / All).
    function matchesRisk(c) {
        if (riskFilter === 'all') return true;
        if (riskFilter === 'high') return c?.risk_level === 'high' || c?.crisis;
        return c?.risk_level === riskFilter;
    }

    function renderItem({ item }) {
        const isHighRisk = item.risk_level === 'high' || item.crisis;
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('YouthProfile', { conversation: item, worker })}>

                <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: isHighRisk ? '#FFE5E5' : '#FCEFD7' }]}>
                        <Text style={[styles.avatarText, { color: isHighRisk ? '#FF3B30' : '#D97706' }]}>
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
                        <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.risk_level) }]}>
                                {isHighRisk && <AlertTriangle size={9} color="#fff" style={{ marginRight: 3 }} />}
                                <Text style={styles.riskText}>{(item.risk_level || 'unknown').toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    const content = (
        <View style={{ flex: 1 }}>
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: 'transparent' }]}>
                <Text style={styles.headerEyebrow}>LANTERN</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Cases</Text>
            </SafeAreaView>

            <View style={styles.segmentRow}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.segBtn, activeTab === 'active' && [styles.segBtnActive, { backgroundColor: colors.card }]]}
                    onPress={() => setActiveTab('active')}>
                    <Text style={[styles.segText, { color: activeTab === 'active' ? colors.text : colors.subtext }]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.segBtn, activeTab === 'handedover' && [styles.segBtnActive, { backgroundColor: colors.card }]]}
                    onPress={() => setActiveTab('handedover')}>
                    <Text style={[styles.segText, { color: activeTab === 'handedover' ? colors.text : colors.subtext }]}>Handed Over</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search size={16} color={colors.subtext} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search your cases…"
                    placeholderTextColor={colors.subtext}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                />
                {search ? (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                        <X size={16} color={colors.subtext} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.filterRow}>
                {RISK_FILTERS.map(f => {
                    const active = riskFilter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            activeOpacity={0.8}
                            onPress={() => setRiskFilter(f.key)}
                            style={[styles.filterChip, active && styles.filterChipActive, active && { backgroundColor: colors.card }]}>
                            {f.color ? <View style={[styles.filterDot, { backgroundColor: f.color }]} /> : null}
                            <Text style={[styles.filterChipText, { color: active ? colors.text : colors.subtext }]}>{f.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {activeTab === 'active' ? (
                <>
                    {pendingRequests.length > 0 && (
                        <View style={styles.requestsSection}>
                            <View style={styles.requestsHeader}>
                                <Repeat size={14} color="#D97706" />
                                <Text style={[styles.requestsTitle, { color: colors.text }]}>
                                    Handover Request{pendingRequests.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            {pendingRequests.map(req => (
                                <TouchableOpacity
                                    key={req.id}
                                    style={[styles.requestCard, { backgroundColor: colors.card }]}
                                    activeOpacity={0.7}
                                    disabled={!req.conversation}
                                    onPress={() => navigation.navigate('YouthProfile', {
                                        conversation: req.conversation,
                                        worker,
                                        readOnly: true,
                                        handoverPending: true,
                                    })}>
                                    <View style={styles.requestInfo}>
                                        <Text style={[styles.requestName, { color: colors.text }]}>
                                            {req.conversation?.display_name || req.conversation?.username || 'Unknown youth'}
                                        </Text>
                                        <Text style={styles.requestFrom}>from {req.from_worker} · tap to view summary</Text>
                                        {req.note ? <Text style={[styles.requestNote, { color: colors.subtext }]}>"{req.note}"</Text> : null}
                                    </View>
                                    <View style={styles.requestActions}>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            onPress={() => respondToRequest(req, false)}
                                            disabled={respondingId === req.id}>
                                            <X size={16} color="#FF3B30" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={() => respondToRequest(req, true)}
                                            disabled={respondingId === req.id}>
                                            {respondingId === req.id
                                                ? <ActivityIndicator size="small" color="#fff" />
                                                : <Check size={16} color="#fff" />}
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <FlatList
                        data={cases.filter(c => matchesSearch(c) && matchesRisk(c))}
                        keyExtractor={item => String(item.chat_id)}
                        renderItem={renderItem}
                        style={{ flex: 1, backgroundColor: 'transparent' }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyCases(); }} tintColor="#D97706" />}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Image source={require('../assets/lantern-mark.png')} style={styles.emptyLantern} resizeMode="contain" />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No cases yet</Text>
                                <Text style={styles.emptySub}>Go to Home to claim unassigned youths</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
                    />
                </>
            ) : (
                <FlatList
                    data={allSentHistory.filter(h => matchesSearch(h.conversation) && matchesRisk(h.conversation))}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => {
                        const conv = item.conversation;
                        const isHighRisk = conv?.risk_level === 'high' || conv?.crisis;
                        return (
                            <TouchableOpacity
                                style={[styles.requestCard, { backgroundColor: colors.card, marginHorizontal: 16 }]}
                                onPress={() => navigation.navigate('YouthProfile', { conversation: conv, worker, readOnly: true })}
                                disabled={!conv}>
                                <View style={styles.requestInfo}>
                                    <Text style={[styles.requestName, { color: colors.text }]}>
                                        {conv?.display_name || conv?.username || 'Unknown youth'}
                                    </Text>
                                    <Text style={styles.requestFrom}>now with {workerNames[conv?.assigned_worker] || conv?.assigned_worker || 'unassigned'}</Text>
                                </View>
                                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(conv?.risk_level) }]}>
                                    {isHighRisk && <AlertTriangle size={9} color="#fff" style={{ marginRight: 3 }} />}
                                    <Text style={styles.riskText}>{(conv?.risk_level || 'unknown').toUpperCase()}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    style={{ flex: 1, backgroundColor: 'transparent' }}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, flexGrow: 1 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Image source={require('../assets/lantern-mark.png')} style={styles.emptyLantern} resizeMode="contain" />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No handed over cases</Text>
                            <Text style={styles.emptySub}>Cases you've handed over will appear here, with current status</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={!!acceptedInfo} animationType="fade" transparent>
                <View style={styles.acceptedOverlay}>
                    <View style={[styles.acceptedBox, { backgroundColor: colors.card }]}>
                        <View style={styles.acceptedIconWrap}>
                            <Check size={22} color="#fff" />
                        </View>
                        <Text style={[styles.acceptedTitle, { color: colors.text }]}>Case accepted</Text>
                        <Text style={[styles.acceptedSubtitle, { color: colors.subtext }]}>
                            {acceptedInfo?.youthName} is now your case
                        </Text>
                        {acceptedInfo?.note ? (
                            <View style={styles.acceptedNoteCard}>
                                <View style={styles.handoverBadge}>
                                    <Repeat size={12} color="#fff" />
                                    <Text style={styles.handoverBadgeText}>Note from {acceptedInfo.fromWorkerName}</Text>
                                </View>
                                <Text style={[styles.acceptedNoteText, { color: colors.text }]}>{acceptedInfo.note}</Text>
                            </View>
                        ) : null}
                        <View style={styles.acceptedButtons}>
                            <TouchableOpacity style={styles.acceptedSecondaryBtn} onPress={() => setAcceptedInfo(null)}>
                                <Text style={styles.acceptedSecondaryText}>Got it</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.acceptedPrimaryBtn}
                                onPress={() => {
                                    const conv = acceptedInfo?.conversation;
                                    setAcceptedInfo(null);
                                    if (conv) navigation.navigate('YouthProfile', { conversation: conv, worker });
                                }}>
                                <Text style={styles.acceptedPrimaryText}>View Case</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );

    if (isDark) {
        return (
            <LinearGradient
                colors={['#0E0D0B', '#1A1712', '#251E14']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}>
                {content}
            </LinearGradient>
        );
    }

    return <View style={{ flex: 1, backgroundColor: '#F4F1EC' }}>{content}</View>;
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 },
    headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#D97706', marginBottom: 2 },
    headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    segmentRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 0, marginBottom: 12 },
    segBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
    segBtnActive: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
    segText: { fontSize: 14, fontWeight: '600' },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: 15, padding: 0 },
    filterRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 12 },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    filterChipActive: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    filterDot: { width: 8, height: 8, borderRadius: 4 },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    requestsSection: { paddingHorizontal: 16, paddingTop: 12 },
    requestsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    requestsTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    requestCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    requestInfo: { flex: 1 },
    requestName: { fontSize: 14, fontWeight: '700' },
    requestFrom: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
    requestNote: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    requestActions: { flexDirection: 'row', gap: 8 },
    declineBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,59,48,0.1)', justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
    pendingBadge: { backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    pendingBadgeText: { fontSize: 11, color: '#FF9500', fontWeight: '600' },
    acceptedBadge: { backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    acceptedBadgeText: { fontSize: 11, color: '#34C759', fontWeight: '600' },
    card: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    cardAlert: { borderColor: '#FF3B30', borderWidth: 1.5 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 16, fontWeight: '700' },
    cardInfo: { flex: 1 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    timeAgo: { fontSize: 12, color: '#8E8E93' },
    riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
    riskText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, paddingBottom: 60 },
    emptyLantern: { width: 200, height: 200, opacity: 0.4, marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontWeight: '600', opacity: 0.55 },
    emptySub: { fontSize: 14, color: '#8E8E93', opacity: 0.85, textAlign: 'center' },
    displayName: { fontSize: 15, fontWeight: '700' },
    usernameSmall: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
    progressSection: { borderTopWidth: 0.5, borderTopColor: '#2E2A20', paddingTop: 10, marginBottom: 8 },
    moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    moodLabel: { fontSize: 11, color: '#8E8E93', width: 32 },
    moodTrack: { flex: 1, height: 6, backgroundColor: '#3A3A3C', borderRadius: 3, overflow: 'hidden' },
    moodFill: { height: 6, borderRadius: 3 },
    moodScore: { fontSize: 11, color: '#8E8E93', width: 24, textAlign: 'right' },
    acceptedOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    acceptedBox: { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center' },
    acceptedIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    acceptedTitle: { fontSize: 18, fontWeight: '700' },
    acceptedSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 14, textAlign: 'center' },
    acceptedNoteCard: { width: '100%', backgroundColor: 'rgba(255,149,0,0.08)', borderLeftWidth: 4, borderLeftColor: '#FF9500', borderRadius: 10, padding: 12, marginBottom: 16 },
    handoverBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF9500', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
    handoverBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    acceptedNoteText: { fontSize: 14, lineHeight: 20 },
    acceptedButtons: { flexDirection: 'row', gap: 10, width: '100%' },
    acceptedSecondaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, backgroundColor: 'rgba(142,142,147,0.15)' },
    acceptedSecondaryText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    acceptedPrimaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, backgroundColor: '#D97706' },
    acceptedPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
