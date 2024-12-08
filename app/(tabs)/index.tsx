import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, TextInput, Button } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from '@/fireBaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import LocationList from '@/components/LocationList';
import LocationModal from '@/components/LocationModal';
import axios from 'axios';
import { FlatList, Text, TouchableOpacity } from 'react-native';

type LocationType = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  time: string;
  distance: number;
};
type SearchResultType = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};


export default function MapSelector() {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [savedLocations, setSavedLocations] = useState<LocationType[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationType | null>(
    null
  );
  const [newLocation, setNewLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultType[]>([]);

  const locationsCollection = collection(db, 'locations');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission denied',
          'Allow location permissions to use this feature.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setCurrentLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
        (newLocation) => {
          setCurrentLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });
        }
      );
    })();

    const unsubscribe = onSnapshot(locationsCollection, (snapshot) => {
      const locations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LocationType[];
      setSavedLocations(locations);
    });

    return () => unsubscribe();
  }, []);

  const openModalForNewLocation = (coordinate: { latitude: number; longitude: number }) => {
    setNewLocation(coordinate);
    setEditingLocation(null);
    setEditMode(false);
    setModalVisible(true);
  };

  function openModalForEditLocation(id: string, time: string, distance: number) {
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
  }
  
  const saveLocation = async (name: string, distance: string, time: Date) => {
    if (!newLocation) return;
  
    try {
      // Fetch full address using reverse geocoding
      const [address] = await Location.reverseGeocodeAsync({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
      });
  
      const fullAddress = address
        ? `${address.name || ''}, ${address.street || ''}, ${address.city || ''}, ${address.region || ''}, ${address.country || ''}`
        : 'Address not available';
  
      if (editMode && editingLocation) {
        // Update existing location
        const locationRef = doc(db, 'locations', editingLocation.id);
        await updateDoc(locationRef, {
          name,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          time: time.toLocaleTimeString(),
          distance: parseFloat(distance),
          address: fullAddress,
        });
        Alert.alert('Location Updated', 'The location has been updated.');
      } else {
        // Add new location
        await addDoc(locationsCollection, {
          name,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          time: time.toLocaleTimeString(),
          distance: parseFloat(distance),
          address: fullAddress,
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

  const fetchLocation = async () => {
    if (!searchQuery) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json`,
        {
          headers: {
            'User-Agent': 'YourAppName/1.0 (jonahpupella@gmail.com)',
          },
        }
      );

      const data = await response.json();
      if (data.length > 0) {
        setSearchResults(data); // Store all search results
      } else {
        Alert.alert('No Results', 'No locations found for your search query.');
        setSearchResults([]); // Clear results if no matches
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  const selectSearchResult = (result: any) => {
    const boundingBox = result.boundingbox.map(parseFloat);

    if (
      boundingBox.length === 4 &&
      boundingBox[0] < boundingBox[1] && 
      boundingBox[2] < boundingBox[3] 
    ) {
      setRegion({
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        latitudeDelta: Math.abs(boundingBox[1] - boundingBox[0]),
        longitudeDelta: Math.abs(boundingBox[3] - boundingBox[2]),
      });
    } else {
      Alert.alert('Error', 'Invalid bounding box received from API.');
    }

    // Clear the search results after selection
    setSearchResults([]);
    setSearchQuery(''); // Optionally clear the search query
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search for a location"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <Button title="Search" onPress={() => fetchLocation()} />

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.place_id.toString()}
          style={styles.resultList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => selectSearchResult(item)}
            >
              <Text style={styles.resultText}>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {region && (
        <MapView
          style={styles.map}
          initialRegion={region}
          region={region}
          showsUserLocation
          onPress={(e) => openModalForNewLocation(e.nativeEvent.coordinate)}
        >
          {savedLocations.map((location) => (
            <React.Fragment key={location.id}>
              <Marker
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                title={location.name}
                description={`Time: ${location.time}, Distance: ${location.distance}m`}
              />
              <Circle
                center={{ latitude: location.latitude, longitude: location.longitude }}
                radius={location.distance}
                strokeColor="rgba(0, 122, 255, 0.5)"
                fillColor="rgba(0, 122, 255, 0.2)"
              />
            </React.Fragment>
          ))}
        </MapView>
      )}

      <LocationList
        currentLocation={currentLocation}
        locations={savedLocations}
        onEdit={(id, time, distance) => openModalForEditLocation(id, time, distance)}
        onDelete={deleteLocation}
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
  map: { flex: 2 },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    margin: 10,
    paddingLeft: 10,
    borderRadius: 5,
  },
  resultList: {
    maxHeight: 200,
    marginHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 16,
  },
});
