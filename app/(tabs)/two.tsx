import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, Button, FlatList, Text } from 'react-native';
import { db } from '@/fireBaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import LocationModal from '@/components/LocationModal';
import { getDistance } from 'geolib'; // Install with npm install geolib

type LocationType = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  time: string;
  distance: number;
};

export default function LocationManager() {
  const [savedLocations, setSavedLocations] = useState<LocationType[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationType | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const locationsCollection = collection(db, 'locations');

  useEffect(() => {
    const unsubscribe = onSnapshot(locationsCollection, (snapshot) => {
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
      });
      setEditMode(true);
      setModalVisible(true);
    }
  };

  const saveLocation = async (name: string, distance: string, time: Date) => {
    try {
      if (editMode && editingLocation) {
        const locationRef = doc(db, 'locations', editingLocation.id);
        await updateDoc(locationRef, {
          name,
          latitude: editingLocation.latitude,
          longitude: editingLocation.longitude,
          time: time.toLocaleTimeString(),
          distance: parseFloat(distance),
        });
        Alert.alert('Location Updated', 'The location has been updated.');
      } else {
        await addDoc(locationsCollection, {
          name,
          latitude: editingLocation?.latitude || 0,
          longitude: editingLocation?.longitude || 0,
          time: time.toLocaleTimeString(),
          distance: parseFloat(distance),
        });
        Alert.alert('Location Saved', 'Your selected location has been saved.');
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const locationRef = doc(db, 'locations', id);
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
              <Text style={styles.text}>
                {item.name || 'Unnamed Place'} - {updatedDistance} meters away
              </Text>
              <Text style={styles.text}>Time: {updatedTime}</Text>
              <Text style={styles.text}>Distance: {updatedDistance} meters</Text>
              <View style={styles.buttonGroup}>
                <Button title="Edit" onPress={() => openModalForEditLocation(item.id, updatedTime, updatedDistance)} />
                <Button title="Delete" onPress={() => deleteLocation(item.id)} />
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
  container: { flex: 1 },
  list: { flex: 1 },
  item: { padding: 10, borderBottomWidth: 1 },
  text: { marginBottom: 10 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between' },
});
