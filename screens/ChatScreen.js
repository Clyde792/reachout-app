import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

const BOT_URL = 'https://reachout-bot-production.up.railway.app';
const API_KEY = 'reachout123';
const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function ChatScreen({ route }) {
    const { conversation, worker } = route.params;
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
                    <View style={[styles.bubble, isYouth ? styles.youthBubble : isWorker ? styles.workerBubble : styles.botBubble]}>
                        {!isYouth && (
                            <Text style={styles.bubbleLabel}>{isWorker ? '👤 You' : '🤖 Bot'}</Text>
                        )}
                        <Text style={[styles.bubbleText, isYouth ? styles.youthText : styles.botText]}>
                            {item.content?.replace(/^\[Worker [^\]]+\]: /, '') || ''}
                        </Text>
                        <Text style={[styles.bubbleTime, isYouth && { color: '#8E8E93' }]}>
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
                                    <Text style={styles.translateBtnText}>
                                        {translations[item.id] === '...' ? 'Translating...' : '🌐 Translate'}
                                    </Text>
                                </TouchableOpacity>
                            ) : hasTranslation !== '...' ? (
                                <Text style={styles.translationText}>🌐 {hasTranslation}</Text>
                            ) : (
                                <Text style={styles.translatingText}>Translating...</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <View style={styles.handoverBar}>
                <Text style={styles.handoverText}>
                    {botActive ? 'Bot is handling this chat' : "You're chatting live"}
                </Text>
                <TouchableOpacity
                    style={[styles.handoverBtn, botActive && styles.handoverBtnDisabled]}
                    onPress={handBackToBot}
                    disabled={handingBack || botActive}>
                    <Text style={styles.handoverBtnText}>
                        {handingBack ? 'Handing back...' : botActive ? 'Bot Active' : 'Hand Back to Bot'}
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
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendReply} disabled={sending}>
                    <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    handoverBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
    handoverText: { fontSize: 12, color: '#8E8E93', flex: 1 },
    handoverBtn: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    handoverBtnDisabled: { backgroundColor: '#C7C7CC' },
    handoverBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    bubbleWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    leftWrapper: { justifyContent: 'flex-start' },
    rightWrapper: { justifyContent: 'flex-end' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    avatarSmallText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    bubble: { borderRadius: 16, padding: 10, marginBottom: 2 },
    youthBubble: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
    botBubble: { backgroundColor: '#007AFF', borderTopRightRadius: 4 },
    workerBubble: { backgroundColor: '#34C759', borderTopRightRadius: 4 },
    bubbleLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
    bubbleText: { fontSize: 15, lineHeight: 20 },
    youthText: { color: '#1C1C1E' },
    botText: { color: '#fff' },
    bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, alignSelf: 'flex-end' },
    translateRow: { marginTop: 3, marginLeft: 2 },
    translateBtn: { alignSelf: 'flex-start', backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    translateBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' },
    translationText: { fontSize: 12, color: '#007AFF', fontStyle: 'italic' },
    translatingText: { fontSize: 11, color: '#999' },
    inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E5EA' },
    input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100, color: '#1C1C1E' },
    sendBtn: { marginLeft: 8, backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
    sendText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});