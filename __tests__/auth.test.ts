/**
 * Auth unit tests — src/api/auth.ts
 *
 * All Firebase and Firestore calls are mocked so tests run offline.
 * These tests verify the auth API contract, not Firebase internals.
 */

// Mock Firebase modules before imports
jest.mock('../src/firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() },
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn(),
  })),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

import { signUp, login } from '../src/api/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';

const mockUser = { uid: 'uid-123', email: 'test@test.com' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signUp', () => {
  it('creates Firebase Auth account and Firestore user doc', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    (setDoc as jest.Mock).mockResolvedValue(undefined);

    const result = await signUp('test@test.com', 'password123', undefined, true);

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'test@test.com',
      'password123'
    );
    expect(setDoc).toHaveBeenCalledTimes(1);
    // Verify doc shape includes required fields
    const docData = (setDoc as jest.Mock).mock.calls[0][1];
    expect(docData).toMatchObject({
      uid: 'uid-123',
      email: 'test@test.com',
      provider: 'email',
      points: 0,
      sheriff_score: 0,
    });
    expect(result).toBe(mockUser);
  });

  it('throws {code, message} object on Firebase Auth failure', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
      code: 'auth/email-already-in-use',
      message: 'Firebase: Error (auth/email-already-in-use).',
    });

    await expect(signUp('dupe@test.com', 'pass')).rejects.toEqual({
      code: 'auth/email-already-in-use',
      message: 'Firebase: Error (auth/email-already-in-use).',
    });
    // Firestore doc should NOT be created if auth fails
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('throws terms/not-agreed and does not create a doc when consent is missing', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

    await expect(signUp('test@test.com', 'password123')).rejects.toMatchObject({
      code: 'terms/not-agreed',
    });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('re-login (existing doc) merges only email+provider, does not resend full doc', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });
    (setDoc as jest.Mock).mockResolvedValue(undefined);

    await signUp('test@test.com', 'password123');

    const docData = (setDoc as jest.Mock).mock.calls[0][1];
    const setDocOptions = (setDoc as jest.Mock).mock.calls[0][2];
    expect(docData).toEqual({ email: 'test@test.com', provider: 'email' });
    expect(setDocOptions).toEqual({ merge: true });
  });
});

describe('login', () => {
  it('returns user on successful login', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    const result = await login('test@test.com', 'password123');
    expect(result).toBe(mockUser);
  });

  it('throws {code, message} object on wrong password', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
      code: 'auth/wrong-password',
      message: 'Firebase: Error (auth/wrong-password).',
    });

    await expect(login('test@test.com', 'wrong')).rejects.toEqual({
      code: 'auth/wrong-password',
      message: 'Firebase: Error (auth/wrong-password).',
    });
  });
});
