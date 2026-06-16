import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

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

    // Notes state
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
                {
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await res.json();
            setNotes(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
        setLoadingNotes(false);
    }

    async function saveNote() {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/notes`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                    chat_id: conversation.chat_id,
                    worker_email: worker?.email || '',
                    worker_name: worker?.user_metadata?.name || worker?.email || 'Unknown Worker',
                    content: newNote.trim(),
                }),
            });
            console.log('Save note status:', res.status);
            const text = await res.text();
            console.log('Save note response:', text);
            if (res.ok) {
                setNewNote('');
                fetchNotes();
            }
        } catch (e) {
            console.error('Save note error:', e);
        }
        setSavingNote(false);
    }

    async function deleteNote(id) {
        setDeletingNoteId(id);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    Prefer: 'return=minimal',
                },
            });
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (e) {
            console.error(e);
        }
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
        } catch (e) {
            setSocialResult({ error: 'Failed to connect' });
        }
        setAnalysing(false);
    }

    async function confirmHandover() {
        setTransferring(true);
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/conversations?chat_id=eq.${conversation.chat_id}`, {
                method: 'PATCH',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
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
        } catch (e) {
            setTransferring(false);
            console.error(e);
        }
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
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
                    onPress={() => setActiveTab('profile')}>
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>👤 Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'social' && styles.tabActive]}
                    onPress={() => setActiveTab('social')}>
                    <Text style={[styles.tabText, activeTab === 'social' && styles.tabTextActive]}>📱 Social</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
                    onPress={() => setActiveTab('notes')}>
                    <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
                        📝 Notes{notes.length > 0 ? ` (${notes.length})` : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Demographics</Text>
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: colors.subtext }]}>Age</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{conversation.age || 'Not recorded'}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: colors.subtext }]}>School</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{conversation.school || 'Not recorded'}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: colors.subtext }]}>First contact</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>
                                    {conversation.started_at ? new Date(conversation.started_at).toLocaleDateString() : 'Unknown'}
                                </Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: colors.subtext }]}>Time with org</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{getDaysWithOrg()}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Mood Indicator</Text>
                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.moodRow}>
                                <Text style={styles.moodEmoji}>😢</Text>
                                <View style={styles.moodTrack}>
                                    <View style={[styles.moodFill, {
                                        width: `${conversation.mood_score || 50}%`,
                                        backgroundColor: conversation.mood_score >= 60 ? '#34C759' : conversation.mood_score >= 40 ? '#FF9500' : '#FF3B30'
                                    }]} />
                                    <View style={[styles.moodThumb, { left: `${conversation.mood_score || 50}%` }]} />
                                </View>
                                <Text style={styles.moodEmoji}>😊</Text>
                            </View>
                            <Text style={[styles.moodLabel, { color: colors.subtext }]}>
                                {conversation.mood_score >= 70 ? 'Positive — youth appears to be in good spirits'
                                    : conversation.mood_score >= 50 ? 'Neutral — mixed emotional signals detected'
                                        : conversation.mood_score >= 30 ? 'Low — youth appears to be struggling'
                                            : 'Distressed — youth is showing significant emotional distress'}
                            </Text>
                            <Text style={styles.moodScore}>Score: {conversation.mood_score || 50}/100</Text>
                        </View>
                    </View>

                    {(conversation.likes || conversation.dislikes) && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Interests</Text>
                            <View style={[styles.card, { backgroundColor: colors.card }]}>
                                {conversation.likes && (
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: colors.subtext }]}>Likes</Text>
                                        <Text style={[styles.infoValue, { color: colors.text, flex: 1, textAlign: 'right' }]}>{conversation.likes}</Text>
                                    </View>
                                )}
                                {conversation.likes && conversation.dislikes && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                                {conversation.dislikes && (
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoLabel, { color: colors.subtext }]}>Dislikes</Text>
                                        <Text style={[styles.infoValue, { color: colors.text, flex: 1, textAlign: 'right' }]}>{conversation.dislikes}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {conversation.summary && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>AI Summary</Text>
                            <View style={[styles.card, { backgroundColor: colors.card }]}>
                                {(conversation.summary.includes('|||')
                                    ? conversation.summary.split('|||').filter(p => p.trim())
                                    : conversation.summary.split('. ').filter(p => p.trim())
                                ).slice(0, 4).map((point, i) => (
                                    <View key={i} style={styles.bulletRow}>
                                        <Text style={styles.bulletDot}>•</Text>
                                        <Text style={[styles.bulletText, { color: colors.text }]}>{point.trim().replace(/\.+$/, '') + '.'}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {conversation.suggested_action && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Suggested Action</Text>
                            <View style={[styles.card, { backgroundColor: colors.card }]}>
                                {(conversation.suggested_action.includes('|||')
                                    ? conversation.suggested_action.split('|||').filter(p => p.trim())
                                    : [conversation.suggested_action]
                                ).map((action, i) => (
                                    <View key={i} style={styles.bulletRow}>
                                        <Text style={styles.bulletDot}>→</Text>
                                        <Text style={[styles.bulletText, { color: colors.primary }]}>{action.trim()}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {!transferred ? (
                        <TouchableOpacity style={styles.handoverButton} onPress={() => setShowHandoverModal(true)}>
                            <Text style={styles.handoverButtonText}>🔁 Hand Over Case</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.transferredBanner}>
                            <Text style={styles.transferredText}>✅ Case handed over to {selectedWorker?.name}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => navigation.navigate('Chat', { conversation, worker })}>
                        <Text style={styles.chatButtonText}>💬 Start Chatting</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Social Media Tab */}
            {activeTab === 'social' && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    <Text style={[styles.socialTabHint, { color: colors.subtext }]}>Enter the youth's public Instagram username to analyse their recent posts for distress signals. This is a worker-initiated check only.</Text>
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
                            <Text style={styles.analyseBtnText}>{analysing ? '⏳ Analysing...' : '🔍 Analyse Account'}</Text>
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
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Caption Risk</Text>
                                <View style={styles.scoreTrack}>
                                    <View style={[styles.scoreFill, { width: `${socialResult.caption_risk || 0}%`, backgroundColor: '#FF3B30' }]} />
                                </View>
                                <Text style={styles.scoreValue}>{socialResult.caption_risk || 0}%</Text>
                            </View>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Hashtag Risk</Text>
                                <View style={styles.scoreTrack}>
                                    <View style={[styles.scoreFill, { width: `${socialResult.hashtag_risk || 0}%`, backgroundColor: '#FF9500' }]} />
                                </View>
                                <Text style={styles.scoreValue}>{socialResult.hashtag_risk || 0}%</Text>
                            </View>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Frequency Risk</Text>
                                <View style={styles.scoreTrack}>
                                    <View style={[styles.scoreFill, { width: `${socialResult.frequency_risk || 0}%`, backgroundColor: '#007AFF' }]} />
                                </View>
                                <Text style={styles.scoreValue}>{socialResult.frequency_risk || 0}%</Text>
                            </View>
                            {socialResult.flags && socialResult.flags.length > 0 && (
                                <View style={styles.flagsBox}>
                                    <Text style={styles.flagsTitle}>⚠️ Flags detected:</Text>
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
                            <Text style={styles.socialError}>⚠️ {socialResult.error}</Text>
                            <Text style={styles.errorHint}>The account may be private or the username is incorrect. Please check manually.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={120}>
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

                        {/* Add Note */}
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
                                    : <Text style={styles.saveNoteBtnText}>💾 Save Note</Text>
                                }
                            </TouchableOpacity>
                        </View>

                        {/* Notes List */}
                        {loadingNotes ? (
                            <ActivityIndicator color="#007AFF" style={{ marginTop: 32 }} />
                        ) : notes.length === 0 ? (
                            <View style={styles.emptyNotes}>
                                <Text style={styles.emptyNotesEmoji}>📝</Text>
                                <Text style={[styles.emptyNotesTitle, { color: colors.text }]}>No notes yet</Text>
                                <Text style={[styles.emptyNotesSub, { color: colors.subtext }]}>Add your first note above</Text>
                            </View>
                        ) : (
                            notes.map(note => (
                                <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.card }]}>
                                    <View style={styles.noteHeader}>
                                        <View style={styles.noteAuthorRow}>
                                            <View style={styles.noteAvatar}>
                                                <Text style={styles.noteAvatarText}>
                                                    {(note.worker_name || 'W').slice(0, 2).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={[styles.noteAuthor, { color: colors.text }]}>{note.worker_name || 'Unknown Worker'}</Text>
                                                <Text style={styles.noteTime}>{formatNoteTime(note.created_at)}</Text>
                                            </View>
                                        </View>
                                        {note.worker_email === (worker?.email || '') && (
                                            <TouchableOpacity
                                                onPress={() => deleteNote(note.id)}
                                                disabled={deletingNoteId === note.id}
                                                style={styles.deleteNoteBtn}>
                                                {deletingNoteId === note.id
                                                    ? <ActivityIndicator size="small" color="#FF3B30" />
                                                    : <Text style={styles.deleteNoteBtnText}>🗑</Text>
                                                }
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={[styles.noteContent, { color: colors.text }]}>{note.content}</Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            {/* Handover Modal Step 1 */}
            <Modal visible={showHandoverModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>🔁 Hand Over Case</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>Select the worker to transfer this case to</Text>
                        {WORKERS.filter(w => w.id !== worker?.id).map(w => (
                            <TouchableOpacity
                                key={w.id}
                                style={[styles.workerOption, { borderColor: colors.border }, selectedWorker?.id === w.id && styles.workerOptionSelected]}
                                onPress={() => setSelectedWorker(w)}>
                                <View style={styles.workerAvatar}>
                                    <Text style={styles.workerAvatarText}>{w.name.slice(0, 2).toUpperCase()}</Text>
                                </View>
                                <View>
                                    <Text style={[styles.workerName, { color: colors.text }]}>{w.name}</Text>
                                    <Text style={styles.workerRole}>{w.role}</Text>
                                </View>
                                {selectedWorker?.id === w.id && <Text style={styles.workerCheck}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                        <Text style={[styles.noteLabel, { color: colors.subtext }]}>Handover Note</Text>
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
                                style={[styles.cancelBtn, { backgroundColor: colors.input }]}
                                onPress={() => { setShowHandoverModal(false); setSelectedWorker(null); setHandoverNote(''); }}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextBtn, !selectedWorker && styles.nextBtnDisabled]}
                                disabled={!selectedWorker}
                                onPress={() => { setShowHandoverModal(false); setShowVerifyModal(true); }}>
                                <Text style={styles.nextBtnText}>Review →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Handover Modal Step 2 */}
            <Modal visible={showVerifyModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView>
                        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>⚠️ Confirm Handover</Text>
                            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>Please review before transferring</Text>
                            <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                <Text style={styles.verifyLabel}>Youth</Text>
                                <Text style={[styles.verifyValue, { color: colors.text }]}>{conversation.display_name || conversation.username} (@{conversation.username})</Text>
                            </View>
                            <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                <Text style={styles.verifyLabel}>Handing over to</Text>
                                <Text style={[styles.verifyValue, { color: colors.text }]}>{selectedWorker?.name}</Text>
                            </View>
                            <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                <Text style={styles.verifyLabel}>Time with organisation</Text>
                                <Text style={[styles.verifyValue, { color: colors.text }]}>{getDaysWithOrg()}</Text>
                            </View>
                            <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                <Text style={styles.verifyLabel}>Risk level</Text>
                                <Text style={[styles.verifyValue, { color: getRiskColor(conversation.risk_level) }]}>
                                    {(conversation.risk_level || 'Unknown').toUpperCase()}
                                </Text>
                            </View>
                            <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                <Text style={styles.verifyLabel}>Mood score</Text>
                                <Text style={[styles.verifyValue, { color: colors.text }]}>{conversation.mood_score || 50}/100</Text>
                            </View>
                            <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                <Text style={styles.verifyLabel}>AI Summary</Text>
                                <Text style={[styles.verifyValue, { color: colors.text }]}>{conversation.summary || 'No summary yet'}</Text>
                            </View>
                            {handoverNote ? (
                                <View style={[styles.verifyCard, { backgroundColor: colors.input }]}>
                                    <Text style={styles.verifyLabel}>Your note</Text>
                                    <Text style={[styles.verifyValue, { color: colors.text }]}>{handoverNote}</Text>
                                </View>
                            ) : null}
                            <View style={styles.warningBox}>
                                <Text style={styles.warningText}>⚠️ This case will be removed from your caseload and transferred to {selectedWorker?.name}. This cannot be undone.</Text>
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.cancelBtn, { backgroundColor: colors.input }]}
                                    onPress={() => { setShowVerifyModal(false); setShowHandoverModal(true); }}>
                                    <Text style={styles.cancelBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={confirmHandover}
                                    disabled={transferring}>
                                    {transferring ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirm Transfer</Text>}
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
    container: { flex: 1 },
    profileHeader: { alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarImage: { width: 72, height: 72, borderRadius: 36 },
    avatarText: { fontSize: 24, fontWeight: '700', color: '#007AFF' },
    displayName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
    usernameText: { fontSize: 13, color: '#8E8E93', marginBottom: 8 },
    riskBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    riskText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 0.5 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#007AFF' },
    tabText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
    tabTextActive: { color: '#007AFF', fontWeight: '700' },
    section: { marginHorizontal: 16, marginTop: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    card: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    infoLabel: { fontSize: 15 },
    infoValue: { fontSize: 15, fontWeight: '500' },
    divider: { height: 0.5 },
    moodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    moodEmoji: { fontSize: 20 },
    moodTrack: { flex: 1, height: 10, backgroundColor: '#3A3A3C', borderRadius: 5, overflow: 'hidden', marginHorizontal: 10, position: 'relative' },
    moodFill: { height: 10, borderRadius: 5 },
    moodThumb: { position: 'absolute', top: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#007AFF', marginLeft: -8 },
    moodLabel: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
    moodScore: { fontSize: 12, color: '#8E8E93', textAlign: 'right' },
    bulletRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
    bulletDot: { fontSize: 16, color: '#007AFF', marginRight: 8, lineHeight: 22 },
    bulletText: { fontSize: 14, lineHeight: 22, flex: 1 },
    handoverButton: { backgroundColor: '#FF9500', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, alignItems: 'center' },
    handoverButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    transferredBanner: { backgroundColor: '#E8F8EF', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, alignItems: 'center' },
    transferredText: { color: '#34C759', fontSize: 15, fontWeight: '600' },
    chatButton: { backgroundColor: '#007AFF', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    chatButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    socialTabHint: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
    socialInput: { borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
    analyseBtn: { backgroundColor: '#007AFF', borderRadius: 10, padding: 12, alignItems: 'center' },
    analyseBtnDisabled: { backgroundColor: '#8E8E93' },
    analyseBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    socialRiskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    socialRiskLabel: { fontSize: 15, fontWeight: '600' },
    overallBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    overallBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    scoreLabel: { fontSize: 12, color: '#8E8E93', width: 100 },
    scoreTrack: { flex: 1, height: 6, backgroundColor: '#3A3A3C', borderRadius: 3, overflow: 'hidden' },
    scoreFill: { height: 6, borderRadius: 3 },
    scoreValue: { fontSize: 12, color: '#8E8E93', width: 35, textAlign: 'right' },
    flagsBox: { backgroundColor: '#FFF5E5', borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 8 },
    flagsTitle: { fontSize: 13, fontWeight: '600', color: '#FF9500', marginBottom: 4 },
    flagItem: { fontSize: 13, color: '#1C1C1E', marginBottom: 2 },
    socialSummary: { fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 4 },
    socialMeta: { fontSize: 11, color: '#8E8E93', marginTop: 6 },
    errorBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 10 },
    socialError: { color: '#FF3B30', fontSize: 14, fontWeight: '600' },
    errorHint: { color: '#8E8E93', fontSize: 12, marginTop: 4 },
    // Notes styles
    noteInputField: { borderRadius: 10, padding: 12, fontSize: 15, minHeight: 90, marginBottom: 10, textAlignVertical: 'top' },
    saveNoteBtn: { backgroundColor: '#007AFF', borderRadius: 10, padding: 12, alignItems: 'center' },
    saveNoteBtnDisabled: { backgroundColor: '#8E8E93' },
    saveNoteBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    emptyNotes: { alignItems: 'center', marginTop: 48 },
    emptyNotesEmoji: { fontSize: 40, marginBottom: 10 },
    emptyNotesTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    emptyNotesSub: { fontSize: 13 },
    noteCard: { borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    noteAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    noteAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center' },
    noteAvatarText: { fontSize: 11, fontWeight: '700', color: '#007AFF' },
    noteAuthor: { fontSize: 13, fontWeight: '600' },
    noteTime: { fontSize: 11, color: '#8E8E93', marginTop: 1 },
    noteContent: { fontSize: 14, lineHeight: 21 },
    deleteNoteBtn: { padding: 4 },
    deleteNoteBtnText: { fontSize: 16 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, marginBottom: 20 },
    workerOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 10 },
    workerOptionSelected: { borderColor: '#007AFF', backgroundColor: '#1A2744' },
    workerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    workerAvatarText: { fontSize: 14, fontWeight: '700', color: '#007AFF' },
    workerName: { fontSize: 15, fontWeight: '600' },
    workerRole: { fontSize: 12, color: '#8E8E93' },
    workerCheck: { marginLeft: 'auto', fontSize: 18, color: '#007AFF' },
    noteLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
    noteInput: { borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
    nextBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 12, padding: 14, alignItems: 'center' },
    nextBtnDisabled: { backgroundColor: '#C7C7CC' },
    nextBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    verifyCard: { borderRadius: 10, padding: 12, marginBottom: 8 },
    verifyLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    verifyValue: { fontSize: 14, fontWeight: '500' },
    warningBox: { backgroundColor: '#FFF5E5', borderRadius: 10, padding: 12, marginTop: 8 },
    warningText: { fontSize: 13, color: '#FF9500', lineHeight: 18 },
    confirmBtn: { flex: 1, backgroundColor: '#FF3B30', borderRadius: 12, padding: 14, alignItems: 'center' },
    confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
