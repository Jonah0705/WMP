import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Modal, Alert, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type LocationModalProps = {
  visible: boolean;
  editMode: boolean;
  locationName: string;
  distance: string;
  time: Date;
  onSave: (name: string, distance: string, time: Date) => void;
  onCancel: () => void;
};

const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  editMode,
  locationName,
  distance,
  time,
  onSave,
  onCancel,
}) => {
  const [localName, setLocalName] = useState(locationName);
  const [localDistance, setLocalDistance] = useState(distance);
  const [localTime, setLocalTime] = useState(new Date(time));  // Ensure initial time is a valid Date
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = () => {
    // Fallback to default values if input is empty
    const finalName = localName.trim() || locationName;
    const finalDistance = localDistance.trim() || distance;

    if (!finalName || !finalDistance) {
      Alert.alert('Error', 'Please fill in all the fields.');
      return;
    }

    onSave(finalName, finalDistance, localTime);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setLocalTime(selectedTime);  // Update time with the selected time
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editMode ? 'Edit Location' : 'Add New Location'}
          </Text>
          <Text>Location Name</Text>
          <TextInput
            style={styles.input}
            placeholder={locationName}
            value={localName}
            onChangeText={setLocalName}
          />
          <Text>Distance (m)</Text>
          <TextInput
            style={styles.input}
            placeholder={distance}
            keyboardType="numeric"
            value={localDistance}
            onChangeText={setLocalDistance}
          />
          <View style={styles.timePickerContainer}>
            <Button title="Set Time" onPress={() => setShowTimePicker(true)} />
            <Text>{`Selected Time: ${localTime.toLocaleTimeString()}`}</Text>
          </View>
          {showTimePicker && (
            <DateTimePicker
              value={localTime}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  timePickerContainer: { marginVertical: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LocationModal;
