import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

const RAILWAY_URL = 'https://reachout-bot-production.up.railway.app';
const API_KEY = 'reachout123';
const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export default function ChatScreen({ route }) {
    const { conversation, worker } = route.params;
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

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

    async function sendReply() {
        if (!text.trim()) return;
        setSending(true);
        try {
            await fetch(`${RAILWAY_URL}/reply`, {
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
        return (
            <View style={[styles.bubbleWrapper, isYouth ? styles.leftWrapper : styles.rightWrapper]}>
                {isYouth && (
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarSmallText}>{conversation.username?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                )}
                <View style={[styles.bubble, isYouth ? styles.youthBubble : isWorker ? styles.workerBubble : styles.botBubble]}>
                    {!isYouth && (
                        <Text style={styles.bubbleLabel}>{isWorker ? '👤 You' : '🤖 Bot'}</Text>
                    )}
                    <Text style={[styles.bubbleText, isYouth ? styles.youthText : styles.botText]}>
                        {item.content?.replace(/^\[Worker [^\]]+\]: /, '') || ''}
                    </Text>
                    <Text style={styles.bubbleTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.statusBar}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>You are now in control — bot is paused</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                style={styles.messageList}
                contentContainerStyle={{ padding: 16 }}
            />

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Message..."
                    placeholderTextColor="#8E8E93"
                    value={text}
                    onChangeText={setText}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                    onPress={sendReply}
                    disabled={sending || !text.trim()}>
                    <Text style={styles.sendText}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    statusBar: { backgroundColor: '#E5F1FF', flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 16 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759', marginRight: 8 },
    statusText: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
    messageList: { flex: 1 },
    bubbleWrapper: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    leftWrapper: { justifyContent: 'flex-start' },
    rightWrapper: { justifyContent: 'flex-end' },
    avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarSmallText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
    bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
    youthBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
    botBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
    workerBubble: { backgroundColor: '#34C759', borderBottomRightRadius: 4 },
    bubbleLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: '600' },
    youthText: { color: '#1C1C1E', fontSize: 15 },
    botText: { color: '#fff', fontSize: 15 },
    bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' },
    inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E5E5EA', alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1C1C1E', maxHeight: 100 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    sendBtnDisabled: { backgroundColor: '#E5E5EA' },
    sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
