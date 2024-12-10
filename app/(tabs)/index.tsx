import React, { useEffect, useState, useRef } from 'react';
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
import { FlatList, Text, TouchableOpacity, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import { getAuth } from 'firebase/auth';


const LOCATION_TASK_NAME = 'background-location-task';

type LocationType = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  time: string;
  distance: number;
  address: string;
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

  const mapRef = useRef<MapView>(null);

const focusOnLocation = (latitude: number, longitude: number) => {
  if (mapRef.current) {
    mapRef.current.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  }
};

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

  useEffect(() => {
    if (currentLocation) {
      savedLocations.forEach(async (location) => {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          location.latitude,
          location.longitude
        );
  
        const isWithinTimeRange = await checkTimeRange(location.time);
  
        if (distance <= location.distance && isWithinTimeRange) {
          console.log(distance);
          console.log(location.distance);
          console.log(isWithinTimeRange);
          const vibrationSetting = await AsyncStorage.getItem('vibrationSetting');
          if (vibrationSetting === 'enabled') {
            Vibration.vibrate([500, 500, 500]); 
          }
        }
      });
    }
  }, [currentLocation, savedLocations, 1000]);
  
  async function checkTimeRange(savedTime: string): Promise<boolean> {
    try {
      const timeRangeString = await AsyncStorage.getItem('timeRange');
      const timeRange = timeRangeString ? parseInt(timeRangeString, 10) : 0; 
  
      if (isNaN(timeRange)) return false; 
  
      const savedTimeDate = parseTime(savedTime);
      const currentTime = new Date();
  
      const timeDiff = Math.abs(currentTime.getTime() - savedTimeDate.getTime()) / (1000 * 60);
  
      return timeDiff <= timeRange; 
    } catch (error) {
      console.error('Error checking time range:', error);
      return false;
    }
  }
  
  function parseTime(timeString: string): Date {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const now = new Date();
    now.setHours(hours, minutes, seconds, 0); 
    return now;
  }
  
  function calculateDistance(lat1: any, lon1: any, lat2: any, lon2: any) {
    const R = 6371e3; 
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; 
  }

  const openModalForNewLocation = (coordinate: { latitude: number; longitude: number }) => {
    setNewLocation(coordinate);
    setEditingLocation(null);
    setEditMode(false);
    setModalVisible(true);
  };
  
  const saveLocation = async (name: string, distance: string, time: Date) => {
    if (!newLocation) return;
  
    try {
      const user = getAuth().currentUser; 
      if (!user) {
        Alert.alert('Error', 'No user is logged in.');
        return;
      }
  
      const [address] = await Location.reverseGeocodeAsync({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
      });
  
      const fullAddress = address
        ? `${address.name || ''}, ${address.street || ''}, ${address.city || ''}, ${address.region || ''}, ${address.country || ''}`
        : 'Address not available';
  
      const userLocationsCollection = collection(db, `locations/${user.uid}/userLocations`);
  
      await addDoc(userLocationsCollection, {
        name,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        time: time.toLocaleTimeString(),
        distance: parseFloat(distance),
        address: fullAddress,
      });
  
      Alert.alert('Location Saved', 'Your selected location has been saved.');
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving location:', error);
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

    setSearchResults([]);
    setSearchQuery(''); 
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
          ref={mapRef}
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
        onLocationPress={focusOnLocation}
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
