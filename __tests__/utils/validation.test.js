/**
 * Registration form validation logic extracted from RegisterScreen.
 * Mirrors the validateForm() function exactly so tests stay in sync.
 */
function validateRegistration(formData) {
  const errors = {};

  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (formData.fullName.trim().split(' ').length < 2) {
    errors.fullName = 'Please enter both first and last name';
  }

  if (!formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
    errors.email = 'Email is invalid';
  }

  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!formData.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(formData.phone.replace(/[^\d]/g, ''))) {
    errors.phone = 'Please enter a valid 10-digit phone number';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

const validForm = {
  fullName: 'James Kalimbo',
  email: 'james@example.com',
  password: 'secret123',
  confirmPassword: 'secret123',
  phone: '0812345678',
};

describe('Registration form validation', () => {
  it('passes validation for a fully valid form', () => {
    const { isValid, errors } = validateRegistration(validForm);
    expect(isValid).toBe(true);
    expect(errors).toEqual({});
  });

  it('rejects an empty full name', () => {
    const { errors } = validateRegistration({ ...validForm, fullName: '' });
    expect(errors.fullName).toBe('Full name is required');
  });

  it('rejects a single-word name (no last name)', () => {
    const { errors } = validateRegistration({ ...validForm, fullName: 'James' });
    expect(errors.fullName).toBe('Please enter both first and last name');
  });

  it('rejects an empty email', () => {
    const { errors } = validateRegistration({ ...validForm, email: '' });
    expect(errors.email).toBe('Email is required');
  });

  it('rejects a malformed email address', () => {
    const { errors } = validateRegistration({ ...validForm, email: 'not-an-email' });
    expect(errors.email).toBe('Email is invalid');
  });

  it('rejects an email missing the TLD', () => {
    const { errors } = validateRegistration({ ...validForm, email: 'user@domain' });
    expect(errors.email).toBe('Email is invalid');
  });

  it('rejects an empty password', () => {
    const { errors } = validateRegistration({ ...validForm, password: '', confirmPassword: '' });
    expect(errors.password).toBe('Password is required');
  });

  it('rejects a password shorter than 6 characters', () => {
    const { errors } = validateRegistration({ ...validForm, password: 'abc', confirmPassword: 'abc' });
    expect(errors.password).toBe('Password must be at least 6 characters');
  });

  it('rejects mismatched passwords', () => {
    const { errors } = validateRegistration({ ...validForm, confirmPassword: 'different' });
    expect(errors.confirmPassword).toBe('Passwords do not match');
  });

  it('rejects an empty phone number', () => {
    const { errors } = validateRegistration({ ...validForm, phone: '' });
    expect(errors.phone).toBe('Phone number is required');
  });

  it('rejects a phone number with fewer than 10 digits', () => {
    const { errors } = validateRegistration({ ...validForm, phone: '12345' });
    expect(errors.phone).toBe('Please enter a valid 10-digit phone number');
  });

  it('accepts phone numbers with non-digit formatting characters', () => {
    // 081-234-5678 strips to 0812345678 (10 digits) — valid
    const { isValid } = validateRegistration({ ...validForm, phone: '081-234-5678' });
    expect(isValid).toBe(true);
  });

  it('returns multiple errors simultaneously for multiple invalid fields', () => {
    const { errors } = validateRegistration({
      fullName: '',
      email: 'bad',
      password: '123',
      confirmPassword: 'xyz',
      phone: '',
    });
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(4);
  });
});
