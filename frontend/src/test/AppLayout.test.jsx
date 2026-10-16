import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from '../components/layout/AppLayout.jsx';

describe('AppLayout smoke tests', () => {
  it('Layout.Smoke: renders AppLayout shell, branding, navigation, and attribution', () => {
    const mockUser = {
      name: 'Ramesh Kumar',
      user_type: 'farmer',
      email: 'ramesh@example.com',
    };

    render(
      <MemoryRouter>
        <AppLayout user={mockUser}>
          <div data-testid="page-content">Farm Dashboard Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Branding
    expect(screen.getByText('AgriAssist')).toBeInTheDocument();

    // User name
    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();

    // Child content
    expect(screen.getByTestId('page-content')).toBeInTheDocument();

    // Weather attribution
    expect(screen.getByText(/Weather data by Open-Meteo\.com/i)).toBeInTheDocument();

    // Navigation links
    expect(screen.getByText('My Farms')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('Crop Advisory')).toBeInTheDocument();
    expect(screen.getByText('Irrigation')).toBeInTheDocument();
    expect(screen.getByText('Finance & Profit')).toBeInTheDocument();
  });
});
