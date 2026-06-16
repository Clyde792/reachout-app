import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Plus, Pencil, Trash2, Users, Mail, Phone } from 'lucide-react-native';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

const EMPTY_FORM = { name: '', role: '', email: '', phone: '' };

export default function ManageWorkersScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);
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
                await fetch(`${SUPABASE_URL}/rest/v1/workers?id=eq.${editingWorker.id}`, {
                    method: 'PATCH',
                    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                    body: JSON.stringify({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim(), phone: form.phone.trim() }),
                });
            } else {
                await fetch(`${SUPABASE_URL}/rest/v1/workers`, {
                    method: 'POST',
                    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                    body: JSON.stringify({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim(), phone: form.phone.trim() }),
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
                                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'return=minimal' },
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
            <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Workers</Text>
                <Text style={[styles.headerSub, { color: colors.subtext }]}>{workers.length} team member{workers.length !== 1 ? 's' : ''}</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#007AFF" style={{ marginTop: 48 }} />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                        <Plus size={18} color="#fff" />
                        <Text style={styles.addBtnText}>Add Worker</Text>
                    </TouchableOpacity>

                    {workers.length === 0 ? (
                        <View style={styles.empty}>
                            <Users size={48} color="#C7C7CC" />
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
                                            <View style={styles.detailRow}>
                                                <Mail size={11} color="#8E8E93" />
                                                <Text style={styles.workerDetail}>{w.email}</Text>
                                            </View>
                                        ) : null}
                                        {w.phone ? (
                                            <View style={styles.detailRow}>
                                                <Phone size={11} color="#8E8E93" />
                                                <Text style={styles.workerDetail}>{w.phone}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={styles.workerActions}>
                                        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(w)}>
                                            <Pencil size={13} color="#007AFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => deleteWorker(w)}
                                            disabled={deletingId === w.id}>
                                            {deletingId === w.id
                                                ? <ActivityIndicator size="small" color="#FF3B30" />
                                                : <Trash2 size={15} color="#FF3B30" />}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal visible={showModal} animationType="slide" transparent>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingWorker ? 'Edit Worker' : 'Add Worker'}
                            </Text>

                            {[
                                { label: 'Name *', key: 'name', placeholder: 'Full name', keyboard: 'default' },
                                { label: 'Role', key: 'role', placeholder: 'e.g. Youth Worker', keyboard: 'default' },
                                { label: 'Email', key: 'email', placeholder: 'email@reachout.sg', keyboard: 'email-address' },
                                { label: 'Phone', key: 'phone', placeholder: '+65 9123 4567', keyboard: 'phone-pad' },
                            ].map(({ label, key, placeholder, keyboard }) => (
                                <View key={key}>
                                    <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{label}</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                                        placeholder={placeholder}
                                        placeholderTextColor="#8E8E93"
                                        value={form[key]}
                                        onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                                        autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
                                        keyboardType={keyboard}
                                    />
                                </View>
                            ))}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.input }]} onPress={closeModal}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, (!form.name.trim() || saving) && styles.saveBtnDisabled]}
                                    onPress={saveWorker}
                                    disabled={!form.name.trim() || saving}>
                                    {saving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.saveBtnText}>{editingWorker ? 'Save Changes' : 'Add Worker'}</Text>}
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
            <LinearGradient colors={['#0D0D1A', '#1A1A2E', '#16213E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
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
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 14, padding: 14, marginBottom: 16 },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub: { fontSize: 14, marginTop: 4 },
    workerCard: { borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    workerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    workerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    workerAvatarText: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
    workerName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    workerRole: { fontSize: 13, color: '#8E8E93', marginBottom: 4 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    workerDetail: { fontSize: 12, color: '#8E8E93' },
    workerActions: { flexDirection: 'column', gap: 8, alignItems: 'center' },
    editBtn: { backgroundColor: '#E5F1FF', borderRadius: 8, padding: 7 },
    deleteBtn: { padding: 4 },
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