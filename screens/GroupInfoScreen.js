import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Modal, TextInput,
    ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Users, UserPlus, Pencil, LogOut, Check, X } from 'lucide-react-native';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const WRITE = { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export default function GroupInfoScreen({ route, navigation }) {
    const { thread, worker, myName } = route.params;
    const { colors, isDark } = useTheme();
    const myEmail = worker?.email || '';

    const [name, setName] = useState(thread.name || 'Group');
    const [members, setMembers] = useState([]);       // [{member_email, member_name}]
    const [profiles, setProfiles] = useState({});     // email -> profile (photo, last_seen)
    const [loading, setLoading] = useState(true);

    const [showAdd, setShowAdd] = useState(false);
    const [allProfiles, setAllProfiles] = useState([]);
    const [picked, setPicked] = useState({});
    const [adding, setAdding] = useState(false);

    const [showRename, setShowRename] = useState(false);
    const [renameVal, setRenameVal] = useState(thread.name || '');
    const [renaming, setRenaming] = useState(false);

    useFocusEffect(useCallback(() => { load(); }, []));

    async function load() {
        try {
            const [mRes, pRes] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/worker_thread_members?thread_id=eq.${thread.id}&select=member_email,member_name`, { headers: HEADERS }),
                fetch(`${SUPABASE_URL}/rest/v1/worker_profiles?select=email,name,photo_url,photo_base64,last_seen`, { headers: HEADERS }),
            ]);
            const m = await mRes.json();
            const p = await pRes.json();
            const map = {};
            if (Array.isArray(p)) p.forEach(x => { map[x.email] = x; });
            setMembers(Array.isArray(m) ? m : []);
            setProfiles(map);
            setAllProfiles(Array.isArray(p) ? p : []);
        } catch (e) { console.error('Group info load error:', e); }
        setLoading(false);
    }

    function isOnline(email) {
        const ls = profiles[email]?.last_seen;
        return ls ? (Date.now() - new Date(ls).getTime()) < ONLINE_WINDOW_MS : false;
    }
    function getInitials(n) {
        if (!n) return '?';
        const parts = n.trim().split(/\s+/);
        return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    function photoOf(email) {
        const p = profiles[email];
        return p && (p.photo_base64 || p.photo_url);
    }

    const memberEmails = new Set(members.map(m => m.member_email));
    const candidates = allProfiles.filter(p => p.email && !memberEmails.has(p.email));

    async function addMembers() {
        const chosen = Object.values(picked);
        if (!chosen.length) return;
        setAdding(true);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/worker_thread_members`, {
                method: 'POST', headers: { ...WRITE, Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(chosen.map(p => ({ thread_id: thread.id, member_email: p.email, member_name: p.name }))),
            });
            // Post a small system note so the group sees who joined.
            const added = chosen.map(p => p.name).join(', ');
            const note = `__sys__${myName} added ${added}`;
            fetch(`${SUPABASE_URL}/rest/v1/worker_dm_messages`, {
                method: 'POST', headers: WRITE,
                body: JSON.stringify({ thread_id: thread.id, sender_email: myEmail, sender_name: myName, content: note }),
            }).catch(() => {});
            fetch(`${SUPABASE_URL}/rest/v1/worker_threads?id=eq.${thread.id}`, {
                method: 'PATCH', headers: WRITE,
                body: JSON.stringify({ last_message: `${myName} added ${added}`, last_message_time: new Date().toISOString(), last_sender_email: myEmail }),
            }).catch(() => {});
            setPicked({});
            setShowAdd(false);
            await load();
        } catch (e) { console.error('Add members error:', e); }
        setAdding(false);
    }

    async function saveRename() {
        const v = renameVal.trim();
        if (!v) return;
        setRenaming(true);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/worker_threads?id=eq.${thread.id}`, {
                method: 'PATCH', headers: WRITE, body: JSON.stringify({ name: v }),
            });
            setName(v);
            thread.name = v;
            navigation.setParams({ title: v });
            setShowRename(false);
        } catch (e) { console.error('Rename error:', e); }
        setRenaming(false);
    }

    function confirmLeave() {
        Alert.alert('Leave Group', `Leave "${name}"? You'll stop receiving its messages.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Leave', style: 'destructive', onPress: async () => {
                    try {
                        // Post a system note so the group sees who left.
                        await fetch(`${SUPABASE_URL}/rest/v1/worker_dm_messages`, {
                            method: 'POST', headers: WRITE,
                            body: JSON.stringify({ thread_id: thread.id, sender_email: myEmail, sender_name: myName, content: `__sys__${myName} left the group` }),
                        }).catch(() => {});
                        await fetch(`${SUPABASE_URL}/rest/v1/worker_threads?id=eq.${thread.id}`, {
                            method: 'PATCH', headers: WRITE,
                            body: JSON.stringify({ last_message: `${myName} left the group`, last_message_time: new Date().toISOString(), last_sender_email: myEmail }),
                        }).catch(() => {});
                        await fetch(`${SUPABASE_URL}/rest/v1/worker_thread_members?thread_id=eq.${thread.id}&member_email=eq.${encodeURIComponent(myEmail)}`, {
                            method: 'DELETE', headers: WRITE,
                        });
                        navigation.navigate('Tabs');
                    } catch (e) { console.error('Leave error:', e); }
                },
            },
        ]);
    }

    function toggle(p) {
        setPicked(prev => { const n = { ...prev }; if (n[p.email]) delete n[p.email]; else n[p.email] = p; return n; });
    }

    function renderMember({ item }) {
        const online = isOnline(item.member_email);
        const photo = photoOf(item.member_email);
        const isMe = item.member_email === myEmail;
        const isCreator = item.member_email === thread.created_by;
        return (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={styles.avatarWrap}>
                    {photo
                        ? <Image source={{ uri: photo }} style={styles.avatarImg} />
                        : <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(item.member_name)}</Text></View>}
                    <View style={[styles.dot, { backgroundColor: online ? '#34C759' : '#C7C7CC', borderColor: isDark ? '#1A1712' : '#F4F1EC' }]} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {item.member_name || item.member_email}{isMe ? ' (You)' : ''}
                    </Text>
                    <Text style={[styles.sub, { color: online ? '#34C759' : '#8E8E93' }]}>
                        {online ? 'Active now' : (item.member_email)}
                    </Text>
                </View>
                {isCreator && <View style={styles.creatorTag}><Text style={styles.creatorTagText}>Creator</Text></View>}
            </View>
        );
    }

    const content = (
        <View style={{ flex: 1 }}>
            {loading ? (
                <ActivityIndicator color="#D97706" style={{ marginTop: 60 }} />
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Hero */}
                    <View style={styles.hero}>
                        <View style={styles.heroAvatar}><Users size={36} color="#D97706" /></View>
                        <View style={styles.heroNameRow}>
                            <Text style={[styles.heroName, { color: colors.text }]}>{name}</Text>
                            <TouchableOpacity onPress={() => { setRenameVal(name); setShowRename(true); }} style={styles.pencil}>
                                <Pencil size={16} color="#D97706" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.heroSub}>{members.length} member{members.length === 1 ? '' : 's'}</Text>
                    </View>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setPicked({}); setShowAdd(true); }}>
                        <UserPlus size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Add Members</Text>
                    </TouchableOpacity>

                    <Text style={[styles.section, { color: colors.subtext }]}>MEMBERS</Text>
                    {members.map(m => <View key={m.member_email}>{renderMember({ item: m })}</View>)}

                    <TouchableOpacity style={styles.leaveBtn} onPress={confirmLeave}>
                        <LogOut size={17} color="#FF3B30" />
                        <Text style={styles.leaveText}>Leave Group</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Add members modal */}
            <Modal visible={showAdd} animationType="slide" transparent>
                <View style={styles.overlay}>
                    <View style={[styles.sheet, { backgroundColor: colors.card }]}>
                        <View style={styles.sheetHead}>
                            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Members</Text>
                            <TouchableOpacity onPress={() => setShowAdd(false)}><X size={22} color="#8E8E93" /></TouchableOpacity>
                        </View>
                        {candidates.length === 0 ? (
                            <Text style={[styles.sub, { color: colors.subtext, padding: 20, textAlign: 'center' }]}>Everyone's already in this group.</Text>
                        ) : (
                            <FlatList
                                data={candidates}
                                keyExtractor={p => p.email}
                                style={{ maxHeight: 360 }}
                                renderItem={({ item }) => {
                                    const sel = !!picked[item.email];
                                    const photo = item.photo_base64 || item.photo_url;
                                    return (
                                        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => toggle(item)}>
                                            {photo
                                                ? <Image source={{ uri: photo }} style={styles.avatarImg} />
                                                : <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(item.name)}</Text></View>}
                                            <Text style={[styles.name, { color: colors.text, flex: 1, marginLeft: 12 }]} numberOfLines={1}>{item.name}</Text>
                                            <View style={[styles.checkbox, sel && styles.checkboxOn]}>{sel && <Check size={14} color="#fff" />}</View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                        <TouchableOpacity
                            style={[styles.actionBtn, { marginHorizontal: 0, marginTop: 16 }, (!Object.keys(picked).length || adding) && styles.disabled]}
                            onPress={addMembers}
                            disabled={!Object.keys(picked).length || adding}>
                            {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Add {Object.keys(picked).length || ''}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Rename modal */}
            <Modal visible={showRename} animationType="fade" transparent>
                <View style={styles.overlayCenter}>
                    <View style={[styles.dialog, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 14 }]}>Rename Group</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                            value={renameVal} onChangeText={setRenameVal} placeholder="Group name"
                            placeholderTextColor="#8E8E93" autoFocus
                        />
                        <View style={styles.dialogBtns}>
                            <TouchableOpacity style={[styles.cancel, { backgroundColor: colors.input }]} onPress={() => setShowRename(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.save, (!renameVal.trim() || renaming) && styles.disabled]} onPress={saveRename} disabled={!renameVal.trim() || renaming}>
                                {renaming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
    heroAvatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FCEFD7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroName: { fontSize: 22, fontWeight: '700' },
    pencil: { padding: 4 },
    heroSub: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D97706', borderRadius: 14, padding: 13, marginHorizontal: 20, marginTop: 16 },
    actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    disabled: { backgroundColor: '#C7C7CC' },
    section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11, borderBottomWidth: 0.5 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FCEFD7', justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FCEFD7' },
    avatarText: { fontSize: 15, fontWeight: '700', color: '#D97706' },
    dot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5 },
    name: { fontSize: 15, fontWeight: '600' },
    sub: { fontSize: 12, marginTop: 2 },
    creatorTag: { backgroundColor: '#FCEFD7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    creatorTagText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
    leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, marginHorizontal: 20, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,59,48,0.1)' },
    leaveText: { color: '#FF3B30', fontSize: 15, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 18, fontWeight: '700' },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C7C7CC', justifyContent: 'center', alignItems: 'center' },
    checkboxOn: { backgroundColor: '#D97706', borderColor: '#D97706' },
    overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
    dialog: { borderRadius: 20, padding: 22 },
    input: { borderRadius: 12, padding: 14, fontSize: 15 },
    dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
    cancel: { flex: 1, borderRadius: 12, padding: 13, alignItems: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    save: { flex: 1, backgroundColor: '#D97706', borderRadius: 12, padding: 13, alignItems: 'center' },
    saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
