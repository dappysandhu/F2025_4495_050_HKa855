import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { API_BASE_URL } from "@/constants/config";
import axios from 'axios';

export default function SignupScreen() {
  const [username, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skills, setSkills] = useState('');
  const [role, setRole] = useState('resident');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme || 'light'];

  // fetch current location
  const fetchCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to continue.');
      throw new Error('Permission denied');
    }
    const currentLocation = await Location.getCurrentPositionAsync({});
    return {
      type: 'Point',
      coordinates: [currentLocation.coords.longitude, currentLocation.coords.latitude],
    };
  };

  const handleSignup = async () => {
    if (!username || !email || !phone || !password || !confirmPassword || !skills) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      let location = null;
      // get location before sending data
       if (role === "volunteer") {
      location = await fetchCurrentLocation();
    }

      const signupData = {
        username,
        email,
        phone,
        password,
        role,
        skills: skills.split(',').map((s) => s.trim()),
        certified: false,
        location,
      };

      console.log('Sending signup data:', signupData);

      const response = await axios.post(`${API_BASE_URL}/auth/register`, signupData);

      console.log('Signup success:', response.data);

      Alert.alert('Success', 'Account created successfully');
      router.push('/auth/login');
    } catch (error: any) {

      console.error('Signup failed:', error);

      Alert.alert('Signup failed', error.response?.data?.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ThemedText type="title" style={styles.title}>Register</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="Enter your username"
          value={username}
          onChangeText={setUserName}
          placeholderTextColor={themeColors.icon}
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="Enter your e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholderTextColor={themeColors.icon}
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={themeColors.icon}
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={themeColors.icon}
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholderTextColor={themeColors.icon}
        />

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="Enter your skills (comma separated)"
          value={skills}
          onChangeText={setSkills}
          multiline
          placeholderTextColor={themeColors.icon}
        />

        <View style={[styles.pickerContainer, { borderColor: themeColors.icon, backgroundColor: themeColors.background }]}>
          <Picker
            selectedValue={role}
            onValueChange={setRole}
            style={{ color: themeColors.text }}
            dropdownIconColor={themeColors.text}>
            <Picker.Item label="Resident" value="resident" />
            <Picker.Item label="Volunteer" value="volunteer" />
          </Picker>
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#C04A2B' }]} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>Register</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 30,
    alignItems: 'center',
    backgroundColor: '#C04A2B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
