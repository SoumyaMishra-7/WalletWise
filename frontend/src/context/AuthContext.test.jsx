import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../api/client';

// Mock the API client
jest.mock('../api/client');

const TestComponent = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <div>{user ? `User: ${user.name}` : 'No User'}</div>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loadUser sets user on successful API call', async () => {
    api.get.mockResolvedValue({ data: { success: true, user: { name: 'Test User' } } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('User: Test User')).toBeInTheDocument());
  });

  test('loadUser sets user to null on API error', async () => {
    api.get.mockRejectedValue(new Error('API Error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No User')).toBeInTheDocument());
  });
});
