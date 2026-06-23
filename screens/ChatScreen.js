import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, User, Languages, Send } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const BOT_URL = 'https://bot.lanternscs.org';
const API_KEY = '73d80519c6fba42e';
const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function ChatScreen({ route }) {
    const { conversation, worker } = route.params;
    const { colors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [translations, setTranslations] = useState({});
    const [handingBack, setHandingBack] = useState(false);
    const [botActive, setBotActive] = useState(false);
    const translatingRef = useRef({});
    const flatListRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        setWorkerActive(true); // pause bot while worker is in this chat
        return () => {
            clearInterval(interval);
        };
    }, []);

    async function setWorkerActive(active) {
        try {
            await fetch(`${BOT_URL}/worker-active`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: conversation.chat_id, active }),
            });
            setBotActive(!active);
        } catch (e) {
            console.error('Worker active toggle error:', e);
        }
    }

    async function handBackToBot() {
        setHandingBack(true);
        await setWorkerActive(false);
        setHandingBack(false);
    }

    async function fetchMessages() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/messages?chat_id=eq.${conversation.chat_id}&order=created_at.asc`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                    },
                }
            );
            const data = await res.json();
            setMessages(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    }

    async function translateMessage(messageId, content) {
        if (translatingRef.current[messageId]) return;
        translatingRef.current[messageId] = true;
        setTranslations(prev => ({ ...prev, [messageId]: '...' }));
        try {
            const res = await fetch(`${BOT_URL}/translate`, {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: content }),
            });
            const data = await res.json();
            const translated = data?.translated;
            if (translated) {
                setTranslations(prev => ({ ...prev, [messageId]: translated }));
            }
        } catch (e) {
            console.error('Translation error:', e);
            setTranslations(prev => ({ ...prev, [messageId]: null }));
        }
        translatingRef.current[messageId] = false;
    }

    async function sendReply() {
        if (!text.trim()) return;
        setSending(true);
        try {
            await fetch(`${BOT_URL}/reply`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: conversation.chat_id,
                    message: text.trim(),
                    workerName: worker?.email?.split('@')[0] || 'Worker',
                }),
            });
            setText('');
            fetchMessages();
        } catch (e) { }
        setSending(false);
    }

    function renderMessage({ item }) {
        const isYouth = item.role === 'user';
        const isWorker = item.content?.startsWith('[Worker');
        const hasTranslation = translations[item.id];

        return (
            <View style={[styles.bubbleWrapper, isYouth ? styles.leftWrapper : styles.rightWrapper]}>
                {isYouth && (
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>{conversation.username?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                )}
                <View style={{ maxWidth: '75%' }}>
                    <View style={[
                        styles.bubble,
                        isYouth ? [styles.youthBubble, { backgroundColor: colors.card }] : isWorker ? styles.workerBubble : styles.botBubble,
                    ]}>
                        {!isYouth && (
                            <View style={styles.bubbleLabelRow}>
                                {isWorker
                                    ? <User size={11} color="rgba(255,255,255,0.85)" />
                                    : <Bot size={11} color="rgba(255,255,255,0.85)" />}
                                <Text style={styles.bubbleLabel}>{isWorker ? 'You' : 'Bot'}</Text>
                            </View>
                        )}
                        <Text style={[styles.bubbleText, isYouth ? { color: colors.text } : styles.botText]}>
                            {item.content?.replace(/^\[Worker [^\]]+\]: /, '') || ''}
                        </Text>
                        <Text style={[styles.bubbleTime, isYouth ? { color: colors.subtext } : styles.bubbleTimeOnColor]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    {isYouth && (
                        <View style={styles.translateRow}>
                            {!hasTranslation ? (
                                <TouchableOpacity
                                    onPress={() => translateMessage(item.id, item.content)}
                                    style={styles.translateBtn}
                                    disabled={translatingRef.current[item.id]}
                                >
                                    <Languages size={12} color="#fff" />
                                    <Text style={styles.translateBtnText}>
                                        {translations[item.id] === '...' ? 'Translating…' : 'Translate'}
                                    </Text>
                                </TouchableOpacity>
                            ) : hasTranslation !== '...' ? (
                                <View style={styles.translationRow}>
                                    <Languages size={12} color="#D97706" />
                                    <Text style={styles.translationText}>{hasTranslation}</Text>
                                </View>
                            ) : (
                                <Text style={styles.translatingText}>Translating…</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    const content = (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <View style={[styles.handoverBar, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
                <View style={styles.handoverStatusRow}>
                    <View style={[styles.statusDot, { backgroundColor: botActive ? '#8E8E93' : '#34C759' }]} />
                    <Text style={[styles.handoverText, { color: colors.subtext }]}>
                        {botActive ? 'Bot is handling this chat' : "You're chatting live"}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.handoverBtn, botActive && styles.handoverBtnDisabled]}
                    onPress={handBackToBot}
                    disabled={handingBack || botActive}>
                    <Text style={styles.handoverBtnText}>
                        {handingBack ? 'Handing back…' : botActive ? 'Bot Active' : 'Hand Back to Bot'}
                    </Text>
                </TouchableOpacity>
            </View>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id?.toString()}
                renderItem={renderMessage}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            />
            <View style={[styles.inputRow, { backgroundColor: colors.header, borderTopColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message…"
                    placeholderTextColor={colors.subtext}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={sendReply}
                    disabled={sending || !text.trim()}>
                    <Send size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    container: { flex: 1, backgroundColor: 'transparent' },
    handoverBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
    handoverStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    handoverText: { fontSize: 13 },
    handoverBtn: { backgroundColor: '#D97706', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    handoverBtnDisabled: { backgroundColor: '#C7C7CC' },
    handoverBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    bubbleWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    leftWrapper: { justifyContent: 'flex-start' },
    rightWrapper: { justifyContent: 'flex-end' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    avatarSmallText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    bubble: { borderRadius: 16, padding: 12, marginBottom: 2 },
    youthBubble: { borderTopLeftRadius: 4 },
    botBubble: { backgroundColor: '#D97706', borderTopRightRadius: 4 },
    workerBubble: { backgroundColor: '#34C759', borderTopRightRadius: 4 },
    bubbleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    bubbleLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    botText: { color: '#fff' },
    bubbleTime: { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
    bubbleTimeOnColor: { color: 'rgba(255,255,255,0.7)' },
    translateRow: { marginTop: 4, marginLeft: 2 },
    translateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#D97706', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    translateBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    translationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    translationText: { fontSize: 13, color: '#D97706', fontStyle: 'italic', flexShrink: 1 },
    translatingText: { fontSize: 12, color: '#8E8E93' },
    inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 0.5, alignItems: 'flex-end', gap: 8 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
    sendBtn: { backgroundColor: '#D97706', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: '#C7C7CC' },
});
