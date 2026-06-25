import React, { useState } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Check } from 'lucide-react-native';

import { authToken } from '../lib/db';
const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';
// Functions (per-request) so the JWT is read at call time, not frozen at import.
const HEADERS = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${authToken()}` });
const WRITE_HEADERS = () => ({ ...HEADERS(), 'Content-Type': 'application/json', Prefer: 'return=representation' });

export default function NewGroupScreen({ route, navigation }) {
    const { worker, myName, profiles } = route.params;
    const people = profiles || [];
    const { colors, isDark } = useTheme();
    const [name, setName] = useState('');
    const [selected, setSelected] = useState({}); // email -> worker
    const [creating, setCreating] = useState(false);

    const myEmail = worker?.email || '';

    function toggle(w) {
        setSelected(prev => {
            const next = { ...prev };
            if (next[w.email]) delete next[w.email];
            else next[w.email] = w;
            return next;
        });
    }

    function getInitials(n) {
        if (!n) return '?';
        const parts = n.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    const chosen = Object.values(selected);
    const canCreate = name.trim().length > 0 && chosen.length >= 1 && !creating;

    async function createGroup() {
        if (!canCreate) return;
        setCreating(true);
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/worker_threads`, {
                method: 'POST',
                headers: WRITE_HEADERS(),
                body: JSON.stringify({ is_group: true, name: name.trim(), created_by: myEmail }),
            });
            const created = await res.json();
            const thread = Array.isArray(created) ? created[0] : created;

            const members = [
                { thread_id: thread.id, member_email: myEmail, member_name: myName },
                ...chosen.map(w => ({ thread_id: thread.id, member_email: w.email, member_name: w.name })),
            ];
            await fetch(`${SUPABASE_URL}/rest/v1/worker_thread_members`, {
                method: 'POST',
                headers: { ...WRITE_HEADERS(), Prefer: 'return=minimal' },
                body: JSON.stringify(members),
            });

            navigation.replace('TeamChat', { thread, title: thread.name, worker, myName });
        } catch (e) {
            console.error('Create group error:', e);
            setCreating(false);
        }
    }

    function renderWorker({ item }) {
        const isSel = !!selected[item.email];
        const photo = item.photo_base64 || item.photo_url;
        return (
            <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.card, borderColor: isSel ? '#D97706' : colors.border }]}
                onPress={() => toggle(item)}>
                {photo
                    ? <Image source={{ uri: photo }} style={styles.avatarImg} />
                    : <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(item.name)}</Text></View>}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{item.email}</Text>
                </View>
                <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                    {isSel && <Check size={14} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    }

    const content = (
        <View style={{ flex: 1 }}>
            <View style={styles.headerBlock}>
                <Text style={[styles.fieldLabel, { color: colors.subtext }]}>GROUP NAME</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                    placeholder="e.g. Crisis Response Team"
                    placeholderTextColor="#8E8E93"
                    value={name}
                    onChangeText={setName}
                />
                <Text style={[styles.fieldLabel, { color: colors.subtext, marginTop: 18 }]}>
                    ADD MEMBERS{chosen.length ? ` (${chosen.length})` : ''}
                </Text>
            </View>

            <FlatList
                data={people}
                keyExtractor={item => item.email}
                renderItem={renderWorker}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            />

            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.header }]}>
                <TouchableOpacity
                    style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
                    onPress={createGroup}
                    disabled={!canCreate}>
                    {creating
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.createBtnText}>Create Group</Text>}
                </TouchableOpacity>
            </View>
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
    headerBlock: { paddingHorizontal: 20, paddingTop: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
    input: { borderRadius: 12, padding: 14, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1.5 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FCEFD7', justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FCEFD7' },
    avatarText: { fontSize: 14, fontWeight: '700', color: '#D97706' },
    name: { fontSize: 15, fontWeight: '700' },
    sub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C7C7CC', justifyContent: 'center', alignItems: 'center' },
    checkboxOn: { backgroundColor: '#D97706', borderColor: '#D97706' },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, borderTopWidth: 0.5 },
    createBtn: { backgroundColor: '#D97706', borderRadius: 14, padding: 15, alignItems: 'center' },
    createBtnDisabled: { backgroundColor: '#C7C7CC' },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
