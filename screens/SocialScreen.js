import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Smartphone, Search, AlertTriangle, ChevronRight, ArrowLeft, AtSign } from 'lucide-react-native';

const BOT_URL = 'https://bot.lanternscs.org';
const API_KEY = '73d80519c6fba42e';
const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function SocialScreen({ worker }) {
    const { colors, isDark } = useTheme();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const [igUsername, setIgUsername] = useState('');
    const [socialResult, setSocialResult] = useState(null);
    const [analysing, setAnalysing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchMyCases();
        }, [])
    );
    async function fetchMyCases() {
        setLoading(true);
        try {
            const email = worker?.email;
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/conversations?select=*&assigned_worker=eq.${encodeURIComponent(email)}&order=last_message_time.desc.nullslast`,
                { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
            );
            const data = await res.json();
            setCases(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    function selectYouth(item) {
        setSelected(item);
        setIgUsername(item.instagram_username || '');
        setSocialResult(null);
    }

    function backToList() {
        setSelected(null);
        setSocialResult(null);
        setIgUsername('');
    }

    async function analyseInstagram() {
        if (!igUsername.trim()) return;
        setAnalysing(true);
        try {
            const res = await fetch(`${BOT_URL}/analyze-social`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: selected.chat_id, instagram_username: igUsername.trim() }),
            });
            const data = await res.json();
            setSocialResult(data);
        } catch (e) {
            setSocialResult({ error: 'Failed to connect' });
        }
        setAnalysing(false);
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

    function renderYouthItem({ item }) {
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card }]}
                onPress={() => selectYouth(item)}>
                <View style={styles.cardRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(item.username)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                            {item.display_name || item.username || 'Unknown'}
                        </Text>
                        {item.instagram_username ? (
                            <View style={styles.igRow}>
                                <AtSign size={11} color="#8E8E93" />
                                <Text style={styles.igHandle}>@{item.instagram_username}</Text>
                            </View>
                        ) : (
                            <Text style={styles.noIg}>No Instagram saved yet</Text>
                        )}
                    </View>
                    <ChevronRight size={16} color="#C7C7CC" />
                </View>
            </TouchableOpacity>
        );
    }

    // ---- Analysis view (youth selected) ----
    const analysisView = (
        <View style={{ flex: 1 }}>
            <SafeAreaView edges={['top']} style={[styles.header, styles.headerRow, { backgroundColor: 'transparent' }]}>
                <TouchableOpacity onPress={backToList} style={styles.backBtn}>
                    <ArrowLeft size={20} color="#D97706" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        {selected?.display_name || selected?.username}
                    </Text>
                    <Text style={styles.headerSub}>Social Media Check</Text>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                <Text style={[styles.hint, { color: colors.subtext }]}>
                    Enter the youth's public Instagram username to analyse their recent posts for distress signals. This is a supplementary signal only — AI can misread sarcasm, hyperbole, or dark humor common in youth language. Use your professional judgement alongside this result.
                </Text>

                <View style={[styles.inputCard, { backgroundColor: colors.card }]}>
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
                    <View style={[styles.inputCard, { backgroundColor: colors.card, marginTop: 16 }]}>
                        <View style={styles.socialRiskRow}>
                            <Text style={[styles.socialRiskLabel, { color: colors.text }]}>Overall Risk</Text>
                            <View style={[styles.overallBadge, { backgroundColor: getRiskColor(socialResult.risk_level) }]}>
                                <Text style={styles.overallBadgeText}>{(socialResult.risk_level || '').toUpperCase()}</Text>
                            </View>
                        </View>
                        {[
                            { label: 'Caption Risk', value: socialResult.caption_risk, color: '#FF3B30' },
                            { label: 'Hashtag Risk', value: socialResult.hashtag_risk, color: '#FF9500' },
                            { label: 'Frequency Risk', value: socialResult.frequency_risk, color: '#D97706' },
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
        </View>
    );

    // ---- List view (no youth selected yet) ----
    const listView = (
        <View style={{ flex: 1 }}>
            <Image
                source={require('../assets/lantern-mark.png')}
                style={styles.bgLantern}
                resizeMode="contain"
                pointerEvents="none"
            />
            <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: 'transparent' }]}>
                <Text style={styles.headerEyebrow}>LANTERN</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Social Media Check</Text>
            </SafeAreaView>

            {loading ? (
                <ActivityIndicator color="#D97706" style={{ marginTop: 48 }} />
            ) : (
                <FlatList
                    data={cases}
                    keyExtractor={item => String(item.chat_id)}
                    renderItem={renderYouthItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Smartphone size={48} color="#C7C7CC" />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No cases yet</Text>
                            <Text style={styles.emptySub}>Take a case from Home to run a social media check</Text>
                        </View>
                    }
                />
            )}
        </View>
    );

    const content = selected ? analysisView : listView;

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
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { padding: 4 },
    headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#D97706', marginBottom: 2 },
    headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    bgLantern: { position: 'absolute', alignSelf: 'center', top: '32%', width: 200, height: 200, opacity: 0.4 },
    headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
    card: { borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FCEFD7', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 15, fontWeight: '700', color: '#D97706' },
    displayName: { fontSize: 15, fontWeight: '700' },
    igRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    igHandle: { fontSize: 12, color: '#8E8E93' },
    noIg: { fontSize: 12, color: '#C7C7CC', marginTop: 3 },
    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingHorizontal: 32 },
    hint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    inputCard: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    socialInput: { borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 10 },
    analyseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D97706', borderRadius: 12, padding: 12 },
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
});

























