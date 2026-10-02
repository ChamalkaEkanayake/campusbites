import React, { useContext } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AppNavigator = () => {
  const { user, token, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <LoadingSpinner message="Initializing Campus Canteen..." />;
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        {token && user ? <MainTabs /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%'
  }
});
