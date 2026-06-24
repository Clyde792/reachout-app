import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Users, Plus, Search, X } from 'lucide-react-native';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const WRITE_HEADERS = { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=representation' };

// "online" if the worker's app phoned home within the last 2 minutes.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const OPENED_KEY = 'team_last_opened'; // { [threadId]: ISO } for unread badges

export default function TeamScreen({ navigation, worker }) {
    const { colors, isDark } = useTheme();
    const [profiles, setProfiles] = useState([]);      // worker_profiles (the real staff accounts)
    const [presence, setPresence] = useState({});      // email -> last_seen
    const [dmThreads, setDmThreads] = useState({});    // otherEmail -> thread
    const [groups, setGroups] = useState([]);          // group threads I'm in
    const [unread, setUnread] = useState({});          // threadId -> count
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const openedRef = useRef({});

    const myEmail = worker?.email || '';
    const myName = (profiles.find(p => p.email === myEmail)?.name) || myEmail.split('@')[0] || 'Me';

    useFocusEffect(
        useCallback(() => {
            loadAll();
            heartbeat();
            const interval = setInterval(() => { loadPresence(); heartbeat(); }, 20000);
            return () => clearInterval(interval);
        }, [myEmail])
    );

    async function loadAll() {
        try {
            const stored = await AsyncStorage.getItem(OPENED_KEY);
            openedRef.current = stored ? JSON.parse(stored) : {};
        } catch (e) { openedRef.current = {}; }
        await Promise.all([loadProfiles(), loadPresence()]);
        await loadThreads();
        setRefreshing(false);
    }

    async function loadProfiles() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_profiles?select=email,name,phone,photo_url,photo_base64&order=name.asc`,
                { headers: HEADERS }
            );
            const data = await res.json();
            setProfiles(Array.isArray(data) ? data : []);
        } catch (e) { console.error('Load profiles error:', e); }
    }

    async function loadPresence() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_profiles?select=email,last_seen`,
                { headers: HEADERS }
            );
            const data = await res.json();
            const map = {};
            if (Array.isArray(data)) data.forEach(p => { map[p.email] = p.last_seen; });
            setPresence(map);
        } catch (e) { console.error('Load presence error:', e); }
    }

    async function loadThreads() {
        if (!myEmail) return;
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_thread_members?member_email=eq.${encodeURIComponent(myEmail)}&select=thread_id,worker_threads(*)`,
                { headers: HEADERS }
            );
            const rows = await res.json();
            const threads = (Array.isArray(rows) ? rows : []).map(r => r.worker_threads).filter(Boolean);

            const dms = {};
            const grps = [];
            threads.forEach(t => {
                if (t.is_group) grps.push(t);
                else if (t.dm_key) {
                    const other = t.dm_key.split('|').find(e => e !== myEmail);
                    if (other) dms[other] = t;
                }
            });
            grps.sort((a, b) => new Date(b.last_message_time || b.created_at) - new Date(a.last_message_time || a.created_at));
            setDmThreads(dms);
            setGroups(grps);
            computeUnread(threads);
        } catch (e) { console.error('Load threads error:', e); }
    }

    // Unread = messages from someone else newer than the last time I opened the thread.
    async function computeUnread(threads) {
        const opened = openedRef.current || {};
        const candidates = threads.filter(t =>
            t.last_message_time &&
            t.last_sender_email && t.last_sender_email !== myEmail &&
            (!opened[t.id] || new Date(t.last_message_time) > new Date(opened[t.id]))
        );
        const counts = {};
        await Promise.all(candidates.map(async t => {
            const since = opened[t.id] || '1970-01-01T00:00:00Z';
            try {
                const res = await fetch(
                    `${SUPABASE_URL}/rest/v1/worker_dm_messages?thread_id=eq.${t.id}&sender_email=neq.${encodeURIComponent(myEmail)}&created_at=gt.${encodeURIComponent(since)}&select=id`,
                    { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }
                );
                const cr = res.headers.get('content-range') || '';
                const total = parseInt(cr.split('/')[1], 10);
                if (total > 0) counts[t.id] = total;
            } catch (e) { /* best-effort */ }
        }));
        setUnread(counts);
    }

    async function heartbeat() {
        if (!myEmail) return;
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/worker_profiles?on_conflict=email`, {
                method: 'POST',
                headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify({ email: myEmail, last_seen: new Date().toISOString() }),
            });
        } catch (e) { /* presence is best-effort */ }
    }

    async function markOpened(threadId) {
        const opened = { ...(openedRef.current || {}), [threadId]: new Date().toISOString() };
        openedRef.current = opened;
        setUnread(prev => { const n = { ...prev }; delete n[threadId]; return n; });
        try { await AsyncStorage.setItem(OPENED_KEY, JSON.stringify(opened)); } catch (e) {}
    }

    function isOnline(email) {
        const ls = presence[email];
        if (!ls) return false;
        return (Date.now() - new Date(ls).getTime()) < ONLINE_WINDOW_MS;
    }

    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function timeAgo(time) {
        if (!time) return '';
        const diff = Math.floor((Date.now() - new Date(time).getTime()) / 60000);
        if (diff < 1) return 'now';
        if (diff < 60) return `${diff}m`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h`;
        if (diff < 10080) return `${Math.floor(diff / 1440)}d`;
        return new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    async function openDM(other) {
        const dmKey = [myEmail, other.email].sort().join('|');
        let thread = dmThreads[other.email];
        try {
            if (!thread) {
                let res = await fetch(
                    `${SUPABASE_URL}/rest/v1/worker_threads?dm_key=eq.${encodeURIComponent(dmKey)}&select=*`,
                    { headers: HEADERS }
                );
                const found = await res.json();
                thread = Array.isArray(found) && found[0];

                if (!thread) {
                    res = await fetch(`${SUPABASE_URL}/rest/v1/worker_threads`, {
                        method: 'POST', headers: WRITE_HEADERS,
                        body: JSON.stringify({ is_group: false, dm_key: dmKey, created_by: myEmail }),
                    });
                    const created = await res.json();
                    thread = Array.isArray(created) ? created[0] : created;
                    await fetch(`${SUPABASE_URL}/rest/v1/worker_thread_members`, {
                        method: 'POST', headers: { ...WRITE_HEADERS, Prefer: 'return=minimal' },
                        body: JSON.stringify([
                            { thread_id: thread.id, member_email: myEmail, member_name: myName },
                            { thread_id: thread.id, member_email: other.email, member_name: other.name },
                        ]),
                    });
                }
            }
            markOpened(thread.id);
            navigation.navigate('TeamChat', {
                thread, title: other.name, subtitle: isOnline(other.email) ? 'Active now' : 'Offline',
                worker, myName,
            });
        } catch (e) { console.error('Open DM error:', e); }
    }

    function openGroup(thread) {
        markOpened(thread.id);
        navigation.navigate('TeamChat', { thread, title: thread.name, subtitle: 'Group chat', worker, myName });
    }

    // ---- list assembly ----
    const otherProfiles = profiles.filter(p => p.email && p.email !== myEmail);
    const q = search.trim().toLowerCase();
    const dmRows = otherProfiles
        .filter(p => !q || (p.name || '').toLowerCase().includes(q))
        .map(p => ({ profile: p, thread: dmThreads[p.email] || null }))
        .sort((a, b) => {
            const at = a.thread?.last_message_time, bt = b.thread?.last_message_time;
            if (at && bt) return new Date(bt) - new Date(at);
            if (at) return -1;
            if (bt) return 1;
            return (a.profile.name || '').localeCompare(b.profile.name || '');
        });
    const groupRows = groups.filter(g => !q || (g.name || '').toLowerCase().includes(q));
    const onlineCount = otherProfiles.filter(p => isOnline(p.email)).length;

    function Avatar({ profile, group }) {
        const photo = profile && (profile.photo_base64 || profile.photo_url);
        if (group) {
            return <View style={[styles.avatar, { backgroundColor: '#FCEFD7' }]}><Users size={20} color="#D97706" /></View>;
        }
        if (photo) {
            return <Image source={{ uri: photo }} style={styles.avatarImg} />;
        }
        return <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(profile?.name)}</Text></View>;
    }

    function ChatRow({ profile, group, thread, online }) {
        const count = thread ? unread[thread.id] : 0;
        const preview = thread?.last_message
            || (group ? 'No messages yet' : (online ? 'Active now' : 'Tap to start a conversation'));
        return (
            <TouchableOpacity
                style={styles.chatItem}
                activeOpacity={0.6}
                onPress={() => group ? openGroup(thread) : openDM(profile)}>
                <View style={styles.profileSection}>
                    <Avatar profile={profile} group={group} />
                    {!group && (
                        <View style={[styles.statusDot, { backgroundColor: online ? '#34C759' : '#C7C7CC', borderColor: colors.card }]} />
                    )}
                </View>
                <View style={styles.chatDetails}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.workerName, { color: colors.text }]} numberOfLines={1}>
                            {group ? thread.name : profile.name}
                        </Text>
                        {thread?.last_message_time
                            ? <Text style={[styles.timestamp, count ? styles.timestampUnread : null]}>{timeAgo(thread.last_message_time)}</Text>
                            : null}
                    </View>
                    <View style={styles.previewRow}>
                        <Text
                            style={[styles.lastMessage, { color: count ? colors.text : '#8E8E93' }, count ? styles.lastMessageUnread : null]}
                            numberOfLines={1}>
                            {preview}
                        </Text>
                        {count > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{count > 99 ? '99+' : count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    function ListHeader() {
        return (
            <View>
                <TouchableOpacity
                    style={styles.newGroupRow}
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate('NewGroup', { worker, myName, profiles: otherProfiles })}>
                    <View style={styles.newGroupIcon}><Plus size={20} color="#fff" /></View>
                    <Text style={[styles.newGroupText, { color: colors.text }]}>New Group Chat</Text>
                </TouchableOpacity>

                {groupRows.length > 0 && (
                    <>
                        <Text style={[styles.sectionHeader, { color: colors.subtext }]}>GROUP CHATS</Text>
                        {groupRows.map(g => (
                            <ChatRow key={g.id} group thread={g} />
                        ))}
                    </>
                )}

                <Text style={[styles.sectionHeader, { color: colors.subtext }]}>DIRECT MESSAGES</Text>
            </View>
        );
    }

    const content = (
        <View style={{ flex: 1 }}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerEyebrow}>LANTERN</Text>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Team</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.onlinePill}>
                        <View style={styles.onlinePillDot} />
                        <Text style={styles.onlinePillText}>{onlineCount} online</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setShowSearch(s => !s); setSearch(''); }} style={styles.searchBtn}>
                        {showSearch ? <X size={20} color={colors.text} /> : <Search size={20} color={colors.text} />}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {showSearch && (
                <View style={styles.searchWrap}>
                    <Search size={16} color="#8E8E93" />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search teammates & groups"
                        placeholderTextColor="#8E8E93"
                        value={search}
                        onChangeText={setSearch}
                        autoFocus
                    />
                </View>
            )}

            <FlatList
                data={dmRows}
                keyExtractor={item => item.profile.email}
                renderItem={({ item }) => (
                    <ChatRow profile={item.profile} thread={item.thread} online={isOnline(item.profile.email)} />
                )}
                ListHeaderComponent={ListHeader}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor="#D97706" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Image source={require('../assets/lantern-mark.png')} style={styles.emptyLantern} resizeMode="contain" />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            {q ? 'No matches' : 'No teammates yet'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {q ? 'Try a different name' : 'Other staff who log in will appear here'}
                        </Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
            />
        </View>
    );

    if (isDark) {
        return (
            <LinearGradient colors={['#0E0D0B', '#1A1712', '#251E14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
                {content}
            </LinearGradient>
        );
    }
    return <View style={{ flex: 1, backgroundColor: '#F4F1EC' }}>{content}</View>;
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
    headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#D97706', marginBottom: 2 },
    headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(52,199,89,0.12)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
    onlinePillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34C759' },
    onlinePillText: { fontSize: 12, fontWeight: '600', color: '#34C759' },
    searchBtn: { padding: 4 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 6, backgroundColor: 'rgba(142,142,147,0.14)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput: { flex: 1, fontSize: 15, padding: 0 },
    sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
    newGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
    newGroupIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#D97706', justifyContent: 'center', alignItems: 'center' },
    newGroupText: { fontSize: 16, fontWeight: '600' },
    chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    profileSection: { position: 'relative', marginRight: 14 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FCEFD7', justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FCEFD7' },
    avatarText: { fontSize: 17, fontWeight: '700', color: '#D97706' },
    statusDot: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5 },
    chatDetails: { flex: 1, justifyContent: 'center' },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    workerName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
    timestamp: { fontSize: 12, color: '#999' },
    timestampUnread: { color: '#D97706', fontWeight: '700' },
    previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastMessage: { fontSize: 13, flex: 1, marginRight: 8 },
    lastMessageUnread: { fontWeight: '600' },
    unreadBadge: { backgroundColor: '#D97706', borderRadius: 11, minWidth: 22, height: 22, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
    unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, paddingBottom: 60 },
    emptyLantern: { width: 200, height: 200, opacity: 0.4, marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontWeight: '600', opacity: 0.55 },
    emptySub: { fontSize: 14, color: '#8E8E93', opacity: 0.85, textAlign: 'center' },
});
