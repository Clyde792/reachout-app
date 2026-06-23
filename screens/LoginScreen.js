import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { supabase } from '../supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) Alert.alert('Login failed', error.message);
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.inner}>

                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/lantern-mark.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>Lantern</Text>
                    <Text style={styles.tagline}>Worker Portal · Singapore Children's Society</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sign In</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="worker@scs.org.sg"
                            placeholderTextColor="#aaa"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#aaa"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Only authorised SCS workers may access this portal.</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F1EC' },
    inner: { flex: 1, justifyContent: 'center', padding: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 32 },
    logo: { width: 120, height: 120, marginBottom: 16 },
    appName: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
    tagline: { fontSize: 12, color: '#8E8E93', marginTop: 4, textAlign: 'center' },
    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 24,
        shadowColor: '#000', shadowOpacity: 0.08,
        shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    cardTitle: { fontSize: 20, fontWeight: '600', color: '#1C1C1E', marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#F4F1EC', borderRadius: 12,
        padding: 14, fontSize: 16, color: '#1C1C1E',
    },
    button: {
        backgroundColor: '#D97706', borderRadius: 14,
        padding: 16, alignItems: 'center', marginTop: 8,
    },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
    footer: { textAlign: 'center', color: '#8E8E93', fontSize: 12, marginTop: 24 },
});