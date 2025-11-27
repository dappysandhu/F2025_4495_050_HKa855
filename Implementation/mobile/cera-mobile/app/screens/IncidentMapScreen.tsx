import { useLocalSearchParams } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import BackHeader from "@/components/ui/BackHeader";

export default function IncidentMapScreen() {
  const { lat, lng } = useLocalSearchParams();

  const latitude = Number(lat);
  const longitude = Number(lng);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackHeader title="Emergency Location" />
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={{ latitude, longitude }} />
      </MapView>
    </SafeAreaView>
  );
}
