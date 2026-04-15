import { User as FirebaseUser } from 'firebase/auth';
import { create } from 'zustand';
import { KakaoUser } from '../api/kakaoAuth';

interface AuthState {
  user:           FirebaseUser | null; // Firebase Auth (email / Google / Apple)
  kakaoUser:      KakaoUser   | null; // Kakao OAuth session
  loading:        boolean;
  setUser:        (user: FirebaseUser | null) => void;
  setKakaoUser:   (user: KakaoUser   | null) => void;
  setLoading:     (loading: boolean)          => void;
  isLoggedIn:     () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:       null,
  kakaoUser:  null,
  loading:    true,

  setUser:      (user)      => set({ user,      loading: false }),
  setKakaoUser: (kakaoUser) => set({ kakaoUser, loading: false }),
  setLoading:   (loading)   => set({ loading }),

  // True if either Firebase or Kakao session is active
  isLoggedIn: () => !!(get().user || get().kakaoUser),
}));
