import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

export default function TeamChatScreen({ route }) {
    const { thread, worker, myName } = route.params;
    const { colors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef(null);

    const myEmail = worker?.email || '';
    const isGroup = !!thread?.is_group;

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 4000);
        return () => clearInterval(interval);
    }, []);

    async function fetchMessages() {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/worker_dm_messages?thread_id=eq.${thread.id}&order=created_at.asc`,
                { headers: HEADERS }
            );
            const data = await res.json();
            setMessages(Array.isArray(data) ? data : []);
        } catch (e) { console.error('Fetch team messages error:', e); }
    }

    async function send() {
        const body = text.trim();
        if (!body) return;
        setSending(true);
        setText('');
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/worker_dm_messages`, {
                method: 'POST',
                headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({
                    thread_id: thread.id,
                    sender_email: myEmail,
                    sender_name: myName,
                    content: body,
                }),
            });
            // Keep the thread's last-message preview fresh for the Team list.
            fetch(`${SUPABASE_URL}/rest/v1/worker_threads?id=eq.${thread.id}`, {
                method: 'PATCH',
                headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({ last_message: body, last_message_time: new Date().toISOString(), last_sender_email: myEmail }),
            }).catch(() => {});
            fetchMessages();
        } catch (e) {
            console.error('Send team message error:', e);
            setText(body);
        }
        setSending(false);
    }

    function confirmDelete(item) {
        Alert.alert('Delete message', 'Delete this message for everyone?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    setMessages(prev => prev.filter(m => m.id !== item.id));
                    try {
                        await fetch(`${SUPABASE_URL}/rest/v1/worker_dm_messages?id=eq.${item.id}`, {
                            method: 'DELETE', headers: { ...HEADERS, Prefer: 'return=minimal' },
                        });
                    } catch (e) { console.error('Delete message error:', e); fetchMessages(); }
                },
            },
        ]);
    }

    function renderMessage({ item }) {
        // System notes (joins / leaves) render as a centered grey pill.
        if ((item.content || '').startsWith('__sys__')) {
            return (
                <View style={styles.systemRow}>
                    <Text style={[styles.systemText, { color: colors.subtext }]}>{item.content.replace(/^__sys__/, '')}</Text>
                </View>
            );
        }
        const mine = item.sender_email === myEmail;
        return (
            <View style={[styles.bubbleWrapper, mine ? styles.rightWrapper : styles.leftWrapper]}>
                <TouchableOpacity
                    style={{ maxWidth: '78%' }}
                    activeOpacity={mine ? 0.7 : 1}
                    onLongPress={mine ? () => confirmDelete(item) : undefined}>
                    <View style={[styles.bubble, mine ? styles.mineBubble : [styles.theirsBubble, { backgroundColor: colors.card }]]}>
                        {!mine && isGroup && (
                            <Text style={styles.senderName}>{item.sender_name || item.sender_email?.split('@')[0]}</Text>
                        )}
                        <Text style={[styles.bubbleText, mine ? styles.mineText : { color: colors.text }]}>
                            {item.content}
                        </Text>
                        <Text style={[styles.bubbleTime, mine ? styles.mineTime : { color: colors.subtext }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    const content = (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => String(item.id)}
                renderItem={renderMessage}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>
                            {isGroup ? 'Say hi to the group 👋' : 'No messages yet — start the conversation'}
                        </Text>
                    </View>
                }
            />
            <View style={[styles.inputRow, { backgroundColor: colors.header, borderTopColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                    value={text}
                    onChangeText={setText}
                    placeholder="Message…"
                    placeholderTextColor={colors.subtext}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={send}
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
    systemRow: { alignItems: 'center', marginVertical: 8 },
    systemText: { fontSize: 12, fontStyle: 'italic', backgroundColor: 'rgba(142,142,147,0.14)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
    bubbleWrapper: { flexDirection: 'row', marginBottom: 10 },
    leftWrapper: { justifyContent: 'flex-start' },
    rightWrapper: { justifyContent: 'flex-end' },
    bubble: { borderRadius: 16, padding: 12 },
    mineBubble: { backgroundColor: '#D97706', borderTopRightRadius: 4 },
    theirsBubble: { borderTopLeftRadius: 4 },
    senderName: { fontSize: 11, fontWeight: '700', color: '#D97706', marginBottom: 3 },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    mineText: { color: '#fff' },
    bubbleTime: { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
    mineTime: { color: 'rgba(255,255,255,0.7)' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
    emptyText: { fontSize: 14 },
    inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 0.5, alignItems: 'flex-end', gap: 8 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
    sendBtn: { backgroundColor: '#D97706', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: '#C7C7CC' },
});
