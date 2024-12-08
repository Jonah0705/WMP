import React, { useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/fireBaseConfig"; // Correct path

// Initialize Firebase only if it hasn't been initialized yet
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

// Icon component for Tab Bar
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Memoize screenOptions to prevent unnecessary renders and maintain consistent hooks order
  const screenOptions = useMemo(() => ({
    tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
    headerShown: false, // Avoid conditionally setting this with a hook
    /* headerShown: useClientOnlyValue(false, true), */
  }), [colorScheme]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tab One',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Tab Two',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
       <Tabs.Screen
        name="three"
        options={{
          title: 'Tab Three',  // You can set a custom title for this tab
          tabBarIcon: ({ color }) => <TabBarIcon name="gears" color={color} />,  // Custom icon for third tab
        }}
      />
      
    </Tabs>
  );
}
