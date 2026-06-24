import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

// Full-screen image overlay. Tap anywhere or the X to close.
export default function ImageViewer({ uri, onClose }) {
    return (
        <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <X size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.fill} activeOpacity={1} onPress={onClose}>
                    {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)' },
    closeBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
    fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    image: { width: '100%', height: '100%' },
});
