import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  outlineName: IoniconsName;
  focused: boolean;
  color: string;
}

function TabIcon({ name, outlineName, focused, color }: TabIconProps) {
  return <Ionicons name={focused ? name : outlineName} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.softWhite,
          borderTopColor: Colors.warmSand,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.sageGreen,
        tabBarInactiveTintColor: Colors.charcoal + '66',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" outlineName="home-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="book" outlineName="book-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="pulse" outlineName="pulse-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="leaf" outlineName="leaf-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="person-circle"
              outlineName="person-circle-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
