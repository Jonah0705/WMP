import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, Button, FlatList, Text, TouchableOpacity } from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '@/fireBaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import LocationModal from '@/components/LocationModal';
import { getDistance } from 'geolib';

type LocationType = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  time: string;
  distance: number;
  address: string;
};

export default function LocationManager() {
  const [savedLocations, setSavedLocations] = useState<LocationType[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationType | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const user = getAuth().currentUser; 
    if (!user) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }

    const userLocationsCollection = collection(db, `locations/${user.uid}/userLocations`);

    const unsubscribe = onSnapshot(userLocationsCollection, (snapshot) => {
      const locations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LocationType[];
      setSavedLocations(locations);
    });

    return () => unsubscribe();
  }, []);

  const openModalForEditLocation = (id: string, time: string, distance: number) => {
    const location = savedLocations.find((loc) => loc.id === id);
    if (location) {
      setEditingLocation({
        id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        time,
        distance,
        address: location.address,
      });
      setEditMode(true);
      setModalVisible(true);
    }
  };

  const saveLocation = async (name: string, distance: string, time: Date) => {
    try {
      const user = getAuth().currentUser; 
      if (!user) {
        Alert.alert('Error', 'No user is logged in.');
        return;
      }

      const userLocationsCollection = collection(db, `locations/${user.uid}/userLocations`);

      if (editMode && editingLocation) {
        const locationRef = doc(userLocationsCollection, editingLocation.id);
        await updateDoc(locationRef, {
          name,
          latitude: editingLocation.latitude,
          longitude: editingLocation.longitude,
          time: time.toLocaleTimeString(),
          distance: parseFloat(distance),
          address: editingLocation.address,
        });
        Alert.alert('Location Updated', 'The location has been updated.');
      } else if (currentLocation) {
        const newLocation = {
          name,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          time: time.toLocaleTimeString(),
          distance: parseFloat(distance),
          address: editingLocation?.address || 'No Address Available',
        };
        await addDoc(userLocationsCollection, newLocation);
        Alert.alert('Location Saved', 'Your selected location has been saved.');
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const user = getAuth().currentUser;
      if (!user) {
        Alert.alert('Error', 'No user is logged in.');
        return;
      }

      const userLocationsCollection = collection(db, `locations/${user.uid}/userLocations`);
      const locationRef = doc(userLocationsCollection, id);
      await deleteDoc(locationRef);
      Alert.alert('Location Deleted', 'The location has been deleted.');
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={savedLocations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const distanceFromCurrent =
            currentLocation &&
            getDistance(
              { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              { latitude: item.latitude, longitude: item.longitude }
            );

          const updatedDistance = distanceFromCurrent || item.distance;
          const updatedTime = item.time || 'N/A';

          return (
            <View style={styles.item}>
              <Text style={styles.nameText}>
                {item.name || 'Unnamed Place'}
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.text}>Estimate Arrival: {updatedTime}</Text>
                <Text style={styles.text}>Ring When: {updatedDistance} meters</Text>
              </View>
              <Text style={styles.text}>Full Address: {item.address || 'No Address Available'}</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.button} onPress={() => openModalForEditLocation(item.id, updatedTime, updatedDistance)}>
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => deleteLocation(item.id)}>
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <LocationModal
        visible={modalVisible}
        editMode={editMode}
        locationName={editingLocation?.name || ''}
        distance={editingLocation?.distance.toString() || ''}
        time={editingLocation?.time ? new Date(`1970-01-01T${editingLocation.time}Z`) : new Date()}
        onSave={saveLocation}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  list: { flex: 1 },
  item: { padding: 10, borderBottomWidth: 1 },
  nameText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  text: { marginBottom: 10 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
});
