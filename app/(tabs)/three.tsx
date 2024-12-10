import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Switch, Alert, Button, TextInput, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/fireBaseConfig';

export default function SettingsScreen() {
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(false);
  const [timeRange, setTimeRange] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const savedVibrationSetting = await AsyncStorage.getItem('vibrationSetting');
        setIsVibrationEnabled(savedVibrationSetting === 'enabled');

        const savedTimeRange = await AsyncStorage.getItem('timeRange');
        if (savedTimeRange) {
          setTimeRange(savedTimeRange);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load settings.');
      }
    })();
  }, []);

  const toggleVibration = async () => {
    try {
      const newValue = !isVibrationEnabled;
      setIsVibrationEnabled(newValue);
      await AsyncStorage.setItem('vibrationSetting', newValue ? 'enabled' : 'disabled');
    } catch (error) {
      Alert.alert('Error', 'Failed to update vibration setting.');
    }
  };

  const handleTimeRangeChange = async (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, ''); 
    setTimeRange(numericValue);
    try {
      await AsyncStorage.setItem('timeRange', numericValue);
    } catch (error) {
      Alert.alert('Error', 'Failed to save time range.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.setting}>
        <Switch value={isVibrationEnabled} onValueChange={toggleVibration} />
        <Button
          title={`Vibration: ${isVibrationEnabled ? 'Enabled' : 'Disabled'}`}
          onPress={toggleVibration}
          color="#000" 
        />
      </View>
      <View style={styles.setting}>
        <Text style={styles.label}>Time Range (in minutes):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={timeRange}
          onChangeText={handleTimeRangeChange}
          placeholder="Enter time range"
        />
        <Text>Current Value: {timeRange || 'Not Set'}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setting: {
    marginVertical: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    width: '80%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutButton: {
    width: '80%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: 'transparent',
    marginTop: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
