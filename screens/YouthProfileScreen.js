import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { User, Smartphone, FileText, MessageCircle, Search, AlertTriangle, Trash2, Save, ArrowRight, ArrowLeft, CheckCircle, Users } from 'lucide-react-native';

const RAILWAY_URL = 'https://reachout-bot-production.up.railway.app';
const API_KEY = 'reachout123';
const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

const WORKERS = [
    { id: 'worker_sarah', name: 'Sarah Tan', role: 'Youth Worker' },
    { id: 'worker_james', name: 'James Lim', role: 'Senior Youth Worker' },
    { id: 'worker_priya', name: 'Priya Nair', role: 'Youth Worker' },
];

export default function YouthProfileScreen({ route, navigation }) {
    const { conversation, worker } = route.params;
    const { colors, isDark } = useTheme();

    const [activeTab, setActiveTab] = useState('profile');
    const [igUsername, setIgUsername] = useState(conversation.instagram_username || '');
    const [socialResult, setSocialResult] = useState(null);
    const [analysing, setAnalysing] = useState(false);
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [handoverNote, setHandoverNote] = useState('');
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [transferred, setTransferred] = useState(false);

    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [deletingNoteId, setDeletingNoteId] = useState(null);

    useEffect(() => {
        if (activeTab === 'notes') fetchNotes();
    }, [activeTab]);

    async function fetchNotes() {
        setLoadingNotes(true);
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/notes?chat_id=eq.${conversation.chat_id}&order=created_at.desc`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            setNotes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        setLoadingNotes(false);
    }

    async function saveNote() {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/notes`, {
                method: 'POST',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({
                    chat_id: conversation.chat_id,
                    worker_email: worker?.email || '',
                    worker_name: worker?.user_metadata?.name || worker?.email || 'Unknown Worker',
                    content: newNote.trim(),
                }),
            });
            if (res.ok) { setNewNote(''); fetchNotes(); }
        } catch (e) { console.error('Save note error:', e); }
        setSavingNote(false);
    }

    async function deleteNote(id) {
        setDeletingNoteId(id);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${id}`, {
                method: 'DELETE',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'return=minimal' },
            });
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (e) { console.error(e); }
        setDeletingNoteId(null);
    }

    function formatNoteTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const diffMins = Math.floor((Date.now() - d) / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    async function analyseInstagram() {
        if (!igUsername.trim()) return;
        setAnalysing(true);
        try {
            const res = await fetch(`${RAILWAY_URL}/analyze-social`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: conversation.chat_id, instagram_username: igUsername.trim() }),
            });
            const data = await res.json();
            setSocialResult(data);
        } catch (e) { setSocialResult({ error: 'Failed to connect' }); }
        setAnalysing(false);
    }

    async function confirmHandover() {
        setTransferring(true);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/conversations?chat_id=eq.${conversation.chat_id}`, {
                method: 'PATCH',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({
                    assigned_worker: selectedWorker.id,
                    assigned_worker_name: selectedWorker.name,
                    handover_note: handoverNote,
                    handover_from: worker?.name || 'Previous Worker',
                    handover_at: new Date().toISOString(),
                }),
            });
            setTransferring(false);
            setTransferred(true);
            setShowVerifyModal(false);
        } catch (e) { setTransferring(false); console.error(e); }
    }

    function getDaysWithOrg() {
        if (!conversation.started_at) return 'Unknown';
        const days = Math.floor((Date.now() - new Date(conversation.started_at)) / (1000 * 60 * 60 * 24));
        if (days < 1) return 'Today';
        if (days === 1) return '1 day';
        return `${days} days`;
    }

    function getRiskColor(level) {
        if (level === 'high') return '#FF3B30';
        if (level === 'medium') return '#FF9500';
        return '#34C759';
    }

    function getInitials(username) {
        if (!username) return '?';
        return username.slice(0, 2).toUpperCase();
    }

    const tabs = [
        { key: 'profile', label: 'Profile', Icon: User },
        { key: 'social', label: 'Social', Icon: Smartphone },
        { key: 'notes', label: 'Notes', Icon: FileText },
        { key: 'handover', label: 'Handover', Icon: Users },
    ];

    const content = (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            {/* Profile Header */}
            <View style={[styles.profileHeader, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <View style={styles.avatar}>
                    {conversation.photo_url ? (
                        <Image source={{ uri: conversation.photo_url }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>{getInitials(conversation.username)}</Text>
                    )}
                </View>
                <Text style={[styles.displayName, { color: colors.text }]}>{conversation.display_name || conversation.username || 'Unknown'}</Text>
                <Text style={styles.usernameText}>@{conversation.username || ''}</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(conversation.risk_level) }]}>
                    <Text style={styles.riskText}>{(conversation.risk_level || 'unknown').toUpperCase()} RISK</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                {tabs.map(({ key, label, Icon }) => (
                    <TouchableOpacity
                        key={key}
                        style={[styles.tab, activeTab === key && styles.tabActive]}
                        onPress={() => setActiveTab(key)}>
                        <Icon size={16} color={activeTab === key ? '#007AFF' : '#8E8E93'} />
                        <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Overview</Text>
                        {[
                            { label: 'Age', value: conversation.age || 'Unknown' },
                            { label: 'School', value: conversation.school || 'Unknown' },
                            { label: 'Language', value: conversation.preferred_language || 'English' },
                            { label: 'Days with SCS', value: getDaysWithOrg() },
                            { label: 'Trust Level', value: conversation.trust_level ? `${conversation.trust_level}/100` : 'N/A' },
                            { label: 'Mood Score', value: conversation.mood_score ? `${conversation.mood_score}/100` : 'N/A' },
                        ].map(({ label, value }) => (
                            <View key={label} style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: colors.subtext }]}>{label}</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
                            </View>
                        ))}
                    </View>

                    {conversation.summary ? (
                        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>AI Summary</Text>
                            {conversation.summary.split('|||').map((point, i) => (
                                <Text key={i} style={[styles.summaryPoint, { color: colors.text }]}>• {point}</Text>
                            ))}
                        </View>
                    ) : null}

                    {conversation.suggested_action ? (
                        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Suggested Actions</Text>
                            {conversation.suggested_action.split('|||').map((action, i) => (
                                <Text key={i} style={[styles.summaryPoint, { color: colors.text }]}>• {action}</Text>
                            ))}
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => navigation.navigate('Chat', { conversation, worker })}>
                        <MessageCircle size={18} color="#fff" />
                        <Text style={styles.chatButtonText}>Start Chatting</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Social Tab */}
            {activeTab === 'social' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    <Text style={[styles.socialTabHint, { color: colors.subtext }]}>
                        Enter the youth's public Instagram username to analyse their recent posts for distress signals.
                    </Text>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <TextInput
                            style={[styles.socialInput, { backgroundColor: colors.input, color: colors.text }]}
                            placeholder="e.g. username (without @)"
                            placeholderTextColor="#8E8E93"
                            value={igUsername}
                            onChangeText={setIgUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={[styles.analyseBtn, analysing && styles.analyseBtnDisabled]}
                            onPress={analyseInstagram}
                            disabled={analysing}>
                            {analysing
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Search size={15} color="#fff" />}
                            <Text style={styles.analyseBtnText}>{analysing ? 'Analysing...' : 'Analyse Account'}</Text>
                        </TouchableOpacity>
                    </View>

                    {socialResult && !socialResult.error && (
                        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
                            <View style={styles.socialRiskRow}>
                                <Text style={[styles.socialRiskLabel, { color: colors.text }]}>Overall Risk</Text>
                                <View style={[styles.overallBadge, { backgroundColor: getRiskColor(socialResult.risk_level) }]}>
                                    <Text style={styles.overallBadgeText}>{(socialResult.risk_level || '').toUpperCase()}</Text>
                                </View>
                            </View>
                            {[
                                { label: 'Caption Risk', value: socialResult.caption_risk, color: '#FF3B30' },
                                { label: 'Hashtag Risk', value: socialResult.hashtag_risk, color: '#FF9500' },
                                { label: 'Frequency Risk', value: socialResult.frequency_risk, color: '#007AFF' },
                            ].map(({ label, value, color }) => (
                                <View key={label} style={styles.scoreRow}>
                                    <Text style={styles.scoreLabel}>{label}</Text>
                                    <View style={styles.scoreTrack}>
                                        <View style={[styles.scoreFill, { width: `${value || 0}%`, backgroundColor: color }]} />
                                    </View>
                                    <Text style={styles.scoreValue}>{value || 0}%</Text>
                                </View>
                            ))}
                            {socialResult.flags?.length > 0 && (
                                <View style={styles.flagsBox}>
                                    <View style={styles.flagsHeader}>
                                        <AlertTriangle size={13} color="#FF9500" />
                                        <Text style={styles.flagsTitle}>Flags detected</Text>
                                    </View>
                                    {socialResult.flags.map((flag, i) => (
                                        <Text key={i} style={styles.flagItem}>• {flag}</Text>
                                    ))}
                                </View>
                            )}
                            {socialResult.summary && (
                                <Text style={[styles.socialSummary, { color: colors.text }]}>{socialResult.summary}</Text>
                            )}
                            <Text style={styles.socialMeta}>
                                {socialResult.post_count} posts analysed · Last post {socialResult.days_since_last_post ?? '?'} days ago
                            </Text>
                        </View>
                    )}

                    {socialResult?.error && (
                        <View style={[styles.errorBox, { marginTop: 16 }]}>
                            <AlertTriangle size={14} color="#FF3B30" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.socialError}>{socialResult.error}</Text>
                                <Text style={styles.errorHint}>The account may be private or the username is incorrect.</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                        <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 16 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext, marginBottom: 10 }]}>New Note</Text>
                            <TextInput
                                style={[styles.noteInputField, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="Add a note about this youth..."
                                placeholderTextColor="#8E8E93"
                                value={newNote}
                                onChangeText={setNewNote}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            <TouchableOpacity
                                style={[styles.saveNoteBtn, (!newNote.trim() || savingNote) && styles.saveNoteBtnDisabled]}
                                onPress={saveNote}
                                disabled={!newNote.trim() || savingNote}>
                                {savingNote
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <><Save size={14} color="#fff" /><Text style={styles.saveNoteBtnText}>Save Note</Text></>}
                            </TouchableOpacity>
                        </View>

                        {loadingNotes ? (
                            <ActivityIndicator color="#007AFF" style={{ marginTop: 32 }} />
                        ) : notes.length === 0 ? (
                            <View style={styles.emptyNotes}>
                                <FileText size={40} color="#C7C7CC" />
                                <Text style={[styles.emptyNotesText, { color: colors.subtext }]}>No notes yet</Text>
                            </View>
                        ) : (
                            notes.map(note => (
                                <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.card }]}>
                                    <View style={styles.noteHeader}>
                                        <Text style={[styles.noteWorker, { color: colors.text }]}>{note.worker_name}</Text>
                                        <View style={styles.noteActions}>
                                            <Text style={styles.noteTime}>{formatNoteTime(note.created_at)}</Text>
                                            <TouchableOpacity onPress={() => deleteNote(note.id)} disabled={deletingNoteId === note.id}>
                                                {deletingNoteId === note.id
                                                    ? <ActivityIndicator size="small" color="#FF3B30" />
                                                    : <Trash2 size={15} color="#FF3B30" />}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={[styles.noteContent, { color: colors.text }]}>{note.content}</Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            {/* Handover Tab */}
            {activeTab === 'handover' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {transferred ? (
                        <View style={styles.transferredBanner}>
                            <CheckCircle size={20} color="#34C759" />
                            <Text style={styles.transferredText}>Case handed over to {selectedWorker?.name}</Text>
                        </View>
                    ) : (
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext, marginBottom: 12 }]}>Select Worker</Text>
                            {WORKERS.filter(w => w.id !== worker?.id).map(w => (
                                <TouchableOpacity
                                    key={w.id}
                                    style={[styles.workerOption, { borderColor: colors.border }, selectedWorker?.id === w.id && styles.workerOptionSelected]}
                                    onPress={() => setSelectedWorker(w)}>
                                    <View style={styles.workerAvatar}>
                                        <Text style={styles.workerAvatarText}>{w.name.slice(0, 2).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.workerName, { color: colors.text }]}>{w.name}</Text>
                                        <Text style={styles.workerRole}>{w.role}</Text>
                                    </View>
                                    {selectedWorker?.id === w.id && <CheckCircle size={18} color="#007AFF" />}
                                </TouchableOpacity>
                            ))}

                            <Text style={[styles.noteLabel, { color: colors.subtext, marginTop: 16 }]}>Handover Note</Text>
                            <TextInput
                                style={[styles.noteInput, { backgroundColor: colors.input, color: colors.text }]}
                                placeholder="Add context for the next worker..."
                                placeholderTextColor="#8E8E93"
                                value={handoverNote}
                                onChangeText={setHandoverNote}
                                multiline
                                numberOfLines={3}
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.nextBtn, !selectedWorker && styles.nextBtnDisabled]}
                                    disabled={!selectedWorker}
                                    onPress={() => setShowVerifyModal(true)}>
                                    <Text style={styles.nextBtnText}>Review</Text>
                                    <ArrowRight size={15} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Verify Modal */}
            <Modal visible={showVerifyModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView>
                        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                            <View style={styles.modalTitleRow}>
                                <AlertTriangle size={18} color="#FF9500" />
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Handover</Text>
                            </View>
                            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>Please review before transferring</Text>
                            {[
                                { label: 'Youth', value: `${conversation.display_name || conversation.username} (@${conversation.username})` },
                                { label: 'Handing over to', value: selectedWorker?.name },
                                { label: 'Time with SCS', value: getDaysWithOrg() },
                                { label: 'Risk level', value: (conversation.risk_level || 'Unknown').toUpperCase() },
                                { label: 'Mood score', value: `${conversation.mood_score || 50}/100` },
                            ].map(({ label, value }) => (
                                <View key={label} style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                    <Text style={styles.verifyLabel}>{label}</Text>
                                    <Text style={[styles.verifyValue, { color: colors.text }]}>{value}</Text>
                                </View>
                            ))}
                            {handoverNote ? (
                                <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                    <Text style={styles.verifyLabel}>Your note</Text>
                                    <Text style={[styles.verifyValue, { color: colors.text }]}>{handoverNote}</Text>
                                </View>
                            ) : null}
                            <View style={styles.warningBox}>
                                <Text style={styles.warningText}>This case will be removed from your caseload and transferred to {selectedWorker?.name}. This cannot be undone.</Text>
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.cancelBtn, { backgroundColor: colors.input }]}
                                    onPress={() => setShowVerifyModal(false)}>
                                    <ArrowLeft size={15} color="#8E8E93" />
                                    <Text style={styles.cancelBtnText}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmBtn, transferring && styles.confirmBtnDisabled]}
                                    onPress={confirmHandover}
                                    disabled={transferring}>
                                    {transferring
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <><CheckCircle size={15} color="#fff" /><Text style={styles.confirmBtnText}>Confirm</Text></>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
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
    container: { flex: 1 },
    profileHeader: { alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
    avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarImage: { width: 70, height: 70, borderRadius: 35 },
    avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
    displayName: { fontSize: 20, fontWeight: '700' },
    usernameText: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
    riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
    riskText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
    tabText: { fontSize: 10, color: '#8E8E93', fontWeight: '500' },
    tabTextActive: { color: '#007AFF', fontWeight: '600' },
    card: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 4 },
    sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(142,142,147,0.2)' },
    infoLabel: { fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: '500' },
    snapshotText: { fontSize: 14, lineHeight: 20 },
    summaryPoint: { fontSize: 14, lineHeight: 22 },
    chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 14, padding: 14, marginTop: 16 },
    chatButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    socialTabHint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    socialInput: { borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
    analyseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 12, padding: 12 },
    analyseBtnDisabled: { backgroundColor: '#C7C7CC' },
    analyseBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    socialRiskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    socialRiskLabel: { fontSize: 15, fontWeight: '600' },
    overallBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    overallBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    scoreLabel: { fontSize: 12, color: '#8E8E93', width: 90 },
    scoreTrack: { flex: 1, height: 6, backgroundColor: '#3A3A3C', borderRadius: 3, overflow: 'hidden' },
    scoreFill: { height: 6, borderRadius: 3 },
    scoreValue: { fontSize: 12, color: '#8E8E93', width: 32, textAlign: 'right' },
    flagsBox: { backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 10, padding: 10, marginTop: 8 },
    flagsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    flagsTitle: { fontSize: 13, fontWeight: '600', color: '#FF9500' },
    flagItem: { fontSize: 13, color: '#FF9500', marginTop: 2 },
    socialSummary: { fontSize: 14, lineHeight: 20, marginTop: 10 },
    socialMeta: { fontSize: 12, color: '#8E8E93', marginTop: 8 },
    errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 10, padding: 12 },
    socialError: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
    errorHint: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    noteInputField: { borderRadius: 10, padding: 12, fontSize: 15, minHeight: 90, marginBottom: 10 },
    saveNoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#007AFF', borderRadius: 12, padding: 12 },
    saveNoteBtnDisabled: { backgroundColor: '#C7C7CC' },
    saveNoteBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    emptyNotes: { alignItems: 'center', marginTop: 48, gap: 10 },
    emptyNotesText: { fontSize: 15 },
    noteCard: { borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    noteWorker: { fontSize: 13, fontWeight: '600' },
    noteActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    noteTime: { fontSize: 11, color: '#8E8E93' },
    noteContent: { fontSize: 14, lineHeight: 20 },
    transferredBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: 14, padding: 16 },
    transferredText: { fontSize: 15, color: '#34C759', fontWeight: '600' },
    workerOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
    workerOptionSelected: { borderColor: '#007AFF', backgroundColor: 'rgba(0,122,255,0.05)' },
    workerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center' },
    workerAvatarText: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
    workerName: { fontSize: 14, fontWeight: '600' },
    workerRole: { fontSize: 12, color: '#8E8E93' },
    noteLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    noteInput: { borderRadius: 10, padding: 12, fontSize: 15, minHeight: 80 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
    nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#007AFF', borderRadius: 12, padding: 14 },
    nextBtnDisabled: { backgroundColor: '#C7C7CC' },
    nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalSubtitle: { fontSize: 14, marginBottom: 16 },
    verifyCard: { borderRadius: 10, padding: 12, marginBottom: 8 },
    verifyLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 2 },
    verifyValue: { fontSize: 14, fontWeight: '500' },
    warningBox: { backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 10, padding: 12, marginTop: 8 },
    warningText: { fontSize: 13, color: '#FF9500', lineHeight: 18 },
    cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, padding: 14 },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#007AFF', borderRadius: 12, padding: 14 },
    confirmBtnDisabled: { backgroundColor: '#C7C7CC' },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});