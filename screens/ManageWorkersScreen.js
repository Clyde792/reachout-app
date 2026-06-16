import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

const EMPTY_FORM = { name: '', role: '', email: '', phone: '' };

export default function ManageWorkersScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null); // null = add mode
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        fetchWorkers();
    }, []);

    async function fetchWorkers() {
        setLoading(true);
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/workers?order=created_at.asc`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            setWorkers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    function openAdd() {
        setEditingWorker(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    }

    function openEdit(worker) {
        setEditingWorker(worker);
        setForm({ name: worker.name || '', role: worker.role || '', email: worker.email || '', phone: worker.phone || '' });
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingWorker(null);
        setForm(EMPTY_FORM);
    }

    async function saveWorker() {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (editingWorker) {
                // Update
                await fetch(`${SUPABASE_URL}/rest/v1/workers?id=eq.${editingWorker.id}`, {
                    method: 'PATCH',
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal',
                    },
                    body: JSON.stringify({
                        name: form.name.trim(),
                        role: form.role.trim(),
                        email: form.email.trim(),
                        phone: form.phone.trim(),
                    }),
                });
            } else {
                // Insert
                await fetch(`${SUPABASE_URL}/rest/v1/workers`, {
                    method: 'POST',
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal',
                    },
                    body: JSON.stringify({
                        name: form.name.trim(),
                        role: form.role.trim(),
                        email: form.email.trim(),
                        phone: form.phone.trim(),
                    }),
                });
            }
            closeModal();
            fetchWorkers();
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function deleteWorker(worker) {
        Alert.alert(
            'Remove Worker',
            `Remove ${worker.name} from the team?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: async () => {
                        setDeletingId(worker.id);
                        try {
                            await fetch(`${SUPABASE_URL}/rest/v1/workers?id=eq.${worker.id}`, {
                                method: 'DELETE',
                                headers: {
                                    apikey: SUPABASE_KEY,
                                    Authorization: `Bearer ${SUPABASE_KEY}`,
                                    Prefer: 'return=minimal',
                                },
                            });
                            setWorkers(prev => prev.filter(w => w.id !== worker.id));
                        } catch (e) {
                            console.error(e);
                        }
                        setDeletingId(null);
                    }
                }
            ]
        );
    }

    function getInitials(name) {
        if (!name) return '?';
        return name.slice(0, 2).toUpperCase();
    }

    const content = (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Workers</Text>
                <Text style={[styles.headerSub, { color: colors.subtext }]}>{workers.length} team member{workers.length !== 1 ? 's' : ''}</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#007AFF" style={{ marginTop: 48 }} />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {/* Add Button */}
                    <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                        <Text style={styles.addBtnText}>＋ Add Worker</Text>
                    </TouchableOpacity>

                    {/* Workers List */}
                    {workers.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyEmoji}>👥</Text>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No workers yet</Text>
                            <Text style={[styles.emptySub, { color: colors.subtext }]}>Tap Add Worker to get started</Text>
                        </View>
                    ) : (
                        workers.map(w => (
                            <View key={w.id} style={[styles.workerCard, { backgroundColor: colors.card }]}>
                                <View style={styles.workerRow}>
                                    <View style={styles.workerAvatar}>
                                        <Text style={styles.workerAvatarText}>{getInitials(w.name)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.workerName, { color: colors.text }]}>{w.name}</Text>
                                        {w.role ? <Text style={styles.workerRole}>{w.role}</Text> : null}
                                        {w.email ? (
                                            <Text style={styles.workerDetail}>✉️ {w.email}</Text>
                                        ) : null}
                                        {w.phone ? (
                                            <Text style={styles.workerDetail}>📞 {w.phone}</Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.workerActions}>
                                        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(w)}>
                                            <Text style={styles.editBtnText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => deleteWorker(w)}
                                            disabled={deletingId === w.id}>
                                            {deletingId === w.id
                                                ? <ActivityIndicator size="small" color="#FF3B30" />
                                                : <Text style={styles.deleteBtnText}>🗑</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Add / Edit Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingWorker ? '✏️ Edit Worker' : '➕ Add Worker'}
                            </Text>

                            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Name *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="Full name"
                                placeholderTextColor="#8E8E93"
                                value={form.name}
                                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                            />

                            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Role</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="e.g. Youth Worker, Senior Youth Worker"
                                placeholderTextColor="#8E8E93"
                                value={form.role}
                                onChangeText={v => setForm(f => ({ ...f, role: v }))}
                            />

                            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Email</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="email@reachout.sg"
                                placeholderTextColor="#8E8E93"
                                value={form.email}
                                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />

                            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Phone</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="+65 9123 4567"
                                placeholderTextColor="#8E8E93"
                                value={form.phone}
                                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                                keyboardType="phone-pad"
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.cancelBtn, { backgroundColor: colors.input }]}
                                    onPress={closeModal}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, (!form.name.trim() || saving) && styles.saveBtnDisabled]}
                                    onPress={saveWorker}
                                    disabled={!form.name.trim() || saving}>
                                    {saving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.saveBtnText}>{editingWorker ? 'Save Changes' : 'Add Worker'}</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    headerSub: { fontSize: 13, marginTop: 2 },
    addBtn: { backgroundColor: '#007AFF', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16 },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub: { fontSize: 14, marginTop: 4 },
    workerCard: { borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    workerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    workerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    workerAvatarText: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
    workerName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    workerRole: { fontSize: 13, color: '#8E8E93', marginBottom: 4 },
    workerDetail: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    workerActions: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
    editBtn: { backgroundColor: '#E5F1FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    editBtnText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
    deleteBtn: { padding: 4 },
    deleteBtnText: { fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
    fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
    input: { borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 2 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 24 },
    cancelBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    saveBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnDisabled: { backgroundColor: '#C7C7CC' },
    saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
