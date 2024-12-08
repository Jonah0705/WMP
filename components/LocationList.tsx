import React from 'react';
import { StyleSheet, FlatList, View, Text, Button } from 'react-native';
import { getDistance } from 'geolib'; // Install with npm install geolib

type LocationType = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  time: string; // Time info added
  distance: number; // Distance info added
};

interface LocationListProps {
  locations: LocationType[];
  currentLocation: { latitude: number; longitude: number } | null;
  onEdit: (id: string, time: string, distance: number) => void;
  onDelete: (id: string) => void;
}

const LocationList: React.FC<LocationListProps> = ({
  locations,
  currentLocation,
  onEdit,
  onDelete,
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

        const updatedDistance = distanceFromCurrent || item.distance; // Use calculated distance or existing data
        const updatedTime = item.time || 'N/A'; // Default to 'N/A' if no time info is available

        return (
          <View style={styles.item}>
            <Text style={styles.text}>
              {item.name || 'Unnamed Place'} - {updatedDistance} meters away
            </Text>
            <Text style={styles.text}>Time: {updatedTime}</Text>
            <Text style={styles.text}>Distance: {updatedDistance} meters</Text> {/* Added distance */}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  item: { padding: 10, borderBottomWidth: 1 },
  text: { marginBottom: 10 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between' },
});

export default LocationList;
