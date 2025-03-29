import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';

const Dropdown = ({ items, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);

  const handleSelect = (item) => {
    setSelectedValue(item);
    setIsOpen(false);
    onSelect(item); // Call the onSelect callback function
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
        <Text>{selectedValue ? selectedValue.label : 'Select an item'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <Modal visible={isOpen} animationType="slide" transparent={true}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <FlatList
              data={items}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelect(item)}>
                  <Text>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};
