// Pick an image from the library and upload it to the public "chat-images"
// Supabase Storage bucket. Returns the public URL, or null if cancelled/failed.
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';

const BUCKET = 'chat-images';

// Decode a base64 string to a Uint8Array (Hermes has no Buffer/atob guarantee).
function base64ToBytes(base64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = {};
    for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
    const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
    const len = clean.length;
    const bytes = new Uint8Array(Math.floor((len * 3) / 4));
    let p = 0;
    for (let i = 0; i < len; i += 4) {
        const e1 = lookup[clean[i]];
        const e2 = lookup[clean[i + 1]];
        const e3 = lookup[clean[i + 2]];
        const e4 = lookup[clean[i + 3]];
        bytes[p++] = (e1 << 2) | (e2 >> 4);
        if (e3 !== undefined) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
        if (e4 !== undefined) bytes[p++] = ((e3 & 3) << 6) | e4;
    }
    return bytes.subarray(0, p);
}

export async function pickAndUploadChatImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
    });
    if (result.canceled || !result.assets || !result.assets[0]?.base64) return null;

    try {
        const bytes = base64ToBytes(result.assets[0].base64);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
        if (error) { console.error('Image upload error:', error); return null; }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return data?.publicUrl || null;
    } catch (e) {
        console.error('Image upload exception:', e);
        return null;
    }
}
