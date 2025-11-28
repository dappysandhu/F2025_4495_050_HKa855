import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import BackHeader from "@/components/ui/BackHeader";
import { useLocalSearchParams } from "expo-router";


export default function FileViewerScreen() {
    const { url, name } = useLocalSearchParams();

    const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
        url as string
    )}`;

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <BackHeader title={name as string} />

            <WebView
                style={{ flex: 1 }}
                originWhitelist={["*"]}
                source={{
                    uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                        url as string
                    )}`,
                }}
                javaScriptEnabled
                allowFileAccess
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});
