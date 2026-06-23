import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Switch, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';
import { Camera, Phone, Pencil, LogOut } from 'lucide-react-native';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function ProfileScreen({ worker }) {
    const { colors, isDark } = useTheme();
    const [highRiskAlerts, setHighRiskAlerts] = useState(true);
    const [crisisNotifications, setCrisisNotifications] = useState(true);
    const [profile, setProfile] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        if (!worker?.email) return;
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_profiles?email=eq.${encodeURIComponent(worker.email)}&limit=1`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) setProfile(data[0]);
        } catch (e) { console.error(e); }
    }

    function openEdit() {
        setForm({ name: profile?.name || '', phone: profile?.phone || '' });
        setShowEditModal(true);
    }

    async function saveProfile() {
        if (!worker?.email) return;
        setSaving(true);
        try {
            if (profile) {
                await fetch(`${SUPABASE_URL}/rest/v1/worker_profiles?email=eq.${encodeURIComponent(worker.email)}`, {
                    method: 'PATCH',
                    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                    body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() }),
                });
            } else {
                await fetch(`${SUPABASE_URL}/rest/v1/worker_profiles`, {
                    method: 'POST',
                    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                    body: JSON.stringify({ email: worker.email, name: form.name.trim(), phone: form.phone.trim() }),
                });
            }
            await fetchProfile();
            setShowEditModal(false);
        } catch (e) { console.error(e); }
        setSaving(false);
    }

    async function pickAndUploadPhoto() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true,
        });

        if (result.canceled || !result.assets || !result.assets[0]) return;

        setUploadingPhoto(true);
        try {
            const photoBase64 = 'data:image/jpeg;base64,' + result.assets[0].base64;
            const method = profile ? 'PATCH' : 'POST';
            const url = profile
                ? `${SUPABASE_URL}/rest/v1/worker_profiles?email=eq.${encodeURIComponent(worker.email)}`
                : `${SUPABASE_URL}/rest/v1/worker_profiles`;
            const body = profile
                ? JSON.stringify({ photo_base64: photoBase64 })
                : JSON.stringify({ email: worker.email, photo_base64: photoBase64 });

            await fetch(url, {
                method,
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body,
            });
            await fetchProfile();
        } catch (e) { console.error('Photo save error:', e); }
        setUploadingPhoto(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
    }

    const displayName = profile?.name || worker?.email?.split('@')[0] || 'Worker';
    const initials = displayName.slice(0, 2).toUpperCase();
    const photoSource = profile?.photo_base64 || profile?.photo_url || null;

    const content = (
        <View style={{ flex: 1 }}>
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: 'transparent' }]}>
                <Text style={styles.headerEyebrow}>LANTERN</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
            </SafeAreaView>

            <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }}>
                <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
                    <TouchableOpacity onPress={pickAndUploadPhoto} disabled={uploadingPhoto} style={styles.avatarWrapper}>
                        {photoSource ? (
                            <Image source={{ uri: photoSource }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                        )}
                        <View style={styles.avatarEditBadge}>
                            {uploadingPhoto
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Camera size={13} color="#fff" />}
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
                    <Text style={styles.email}>{worker?.email}</Text>
                    {profile?.phone ? (
                        <View style={styles.phoneRow}>
                            <Phone size={13} color="#8E8E93" />
                            <Text style={styles.phone}>{profile.phone}</Text>
                        </View>
                    ) : null}
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>Youth Worker · SCS</Text>
                    </View>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={openEdit}>
                        <Pencil size={14} color="#D97706" />
                        <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Shift Hours</Text>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.text }]}>Working hours</Text>
                            <Text style={[styles.infoValue, { color: colors.subtext }]}>9:00 AM – 6:00 PM</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.text }]}>Days</Text>
                            <Text style={[styles.infoValue, { color: colors.subtext }]}>Mon – Fri</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.text }]}>After hours</Text>
                            <Text style={[styles.infoValue, { color: '#D97706' }]}>AI bot takes over</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Alerts</Text>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={styles.infoRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.infoLabel, { color: colors.text }]}>High risk alerts</Text>
                                <Text style={styles.alertHint}>Notify when youth is flagged high risk</Text>
                            </View>
                            <Switch value={highRiskAlerts} onValueChange={setHighRiskAlerts} trackColor={{ false: '#3A3A3C', true: '#34C759' }} thumbColor="#fff" />
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.infoRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.infoLabel, { color: colors.text }]}>Crisis notifications</Text>
                                <Text style={styles.alertHint}>Notify for immediate crisis situations</Text>
                            </View>
                            <Switch value={crisisNotifications} onValueChange={setCrisisNotifications} trackColor={{ false: '#3A3A3C', true: '#34C759' }} thumbColor="#fff" />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>About</Text>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.text }]}>Organisation</Text>
                            <Text style={[styles.infoValue, { color: colors.subtext }]}>Singapore Children's Society</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.card }]} onPress={handleLogout}>
                    <LogOut size={17} color="#FF3B30" />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>

            {showEditModal && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="box-none">
                    <View style={styles.overlayBackdrop}>
                        <View style={[styles.overlayBox, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>

                            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Display Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="Your full name"
                                placeholderTextColor="#8E8E93"
                                value={form.name}
                                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                            />

                            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Phone Number</Text>
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
                                    onPress={() => setShowEditModal(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                                    onPress={saveProfile}
                                    disabled={saving}>
                                    {saving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.saveBtnText}>Save</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            )}
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
    header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 },
    headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#D97706', marginBottom: 2 },
    headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    logo: { width: 60, height: 60 },
    profileCard: { alignItems: 'center', padding: 24, marginBottom: 8 },
    avatarWrapper: { position: 'relative', marginBottom: 12 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D97706', justifyContent: 'center', alignItems: 'center' },
    avatarImage: { width: 80, height: 80, borderRadius: 40 },
    avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
    avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#D97706', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    name: { fontSize: 20, fontWeight: '700' },
    email: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    phone: { fontSize: 14, color: '#8E8E93' },
    roleBadge: { backgroundColor: '#FCEFD7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
    roleText: { color: '#D97706', fontSize: 13, fontWeight: '600' },
    editProfileBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#D97706', flexDirection: 'row', alignItems: 'center', gap: 6 },
    editProfileBtnText: { color: '#D97706', fontSize: 14, fontWeight: '600' },
    section: { marginHorizontal: 16, marginTop: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    card: { borderRadius: 16, padding: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
    infoLabel: { fontSize: 15 },
    infoValue: { fontSize: 15, fontWeight: '500' },
    alertHint: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
    divider: { height: 0.5, marginHorizontal: 12 },
    logoutBtn: { marginHorizontal: 16, marginTop: 24, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FF3B30', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    logoutText: { color: '#FF3B30', fontSize: 17, fontWeight: '600' },
    overlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    overlayBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
    fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
    input: { borderRadius: 10, padding: 12, fontSize: 15 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 24 },
    cancelBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    saveBtn: { flex: 1, backgroundColor: '#D97706', borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnDisabled: { backgroundColor: '#C7C7CC' },
    saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});