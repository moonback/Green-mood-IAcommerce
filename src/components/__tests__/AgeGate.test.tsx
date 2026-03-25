import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AgeGate from '../AgeGate';

describe('AgeGate', () => {
  it('renders nothing since it is disabled for arcade equipment', () => {
    const { container } = render(<AgeGate />);
    expect(container.firstChild).toBeNull();
  });
});
