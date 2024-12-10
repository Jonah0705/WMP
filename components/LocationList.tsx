import React from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity } from 'react-native';
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

interface LocationListProps {
  locations: LocationType[];
  currentLocation: { latitude: number; longitude: number } | null;
  onLocationPress: (latitude: number, longitude: number) => void;
}

const LocationList: React.FC<LocationListProps> = ({
  locations,
  currentLocation,
  onLocationPress
}) => {
  return (
    <FlatList
      style={styles.list}
      data={locations}
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
          <TouchableOpacity style={styles.item}  onPress={() => onLocationPress(item.latitude, item.longitude)}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name || 'Unnamed Place'}</Text>
              <Text style={styles.distance}>{updatedDistance} meters</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.subtext}>Estimate Arrival: {updatedTime}</Text>
              <Text style={styles.subtext}>Ring while: {item.distance} meters</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  distance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
  },
  subtext: {
    fontSize: 14,
    color: '#555',
  },
});

export default LocationList;
