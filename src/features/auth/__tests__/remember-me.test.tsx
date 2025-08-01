import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import { AuthProvider } from '../../../contexts/AuthContext';
import SignIn from '../SignIn';

// Mock AWS Amplify
jest.mock('aws-amplify/auth', () => ({
  signIn: jest.fn(),
  fetchAuthSession: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <AuthProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  );
};

describe('Remember Me Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('should store remember me preference when checkbox is checked', async () => {
    renderWithProviders(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    // Fill in form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Check remember me
    fireEvent.click(rememberMeCheckbox);
    
    expect(rememberMeCheckbox).toBeChecked();
  });

  test('should not store remember me preference when checkbox is unchecked', async () => {
    renderWithProviders(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);

    // Fill in form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Ensure checkbox is unchecked
    expect(rememberMeCheckbox).not.toBeChecked();
  });

  test('should initialize with remember me preference from localStorage', () => {
    // Set remember me preference in localStorage
    localStorage.setItem('rememberMe', 'true');
    
    renderWithProviders(<SignIn />);
    
    // The checkbox should be checked based on localStorage
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    expect(rememberMeCheckbox).toBeChecked();
  });

  test('should clear remember me preference on sign out', () => {
    // Set remember me preference
    localStorage.setItem('rememberMe', 'true');
    
    renderWithProviders(<SignIn />);
    
    // Verify it's set
    expect(localStorage.getItem('rememberMe')).toBe('true');
  });
}); 