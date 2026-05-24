import { User as FirebaseUser } from 'firebase/auth';
import { create } from 'zustand';
import { KakaoUser } from '../api/kakaoAuth';

interface AuthState {
  user:               FirebaseUser | null;
  kakaoUser:          KakaoUser   | null;
  loading:            boolean;
  profileComplete:    boolean | null; // null = 아직 확인 안 됨
  nickname:           string | null;
  setUser:            (user: FirebaseUser | null) => void;
  setKakaoUser:       (user: KakaoUser   | null) => void;
  setLoading:         (loading: boolean)          => void;
  setProfileComplete: (v: boolean | null)          => void;
  setNickname:        (nickname: string | null)   => void;
  isLoggedIn:         () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  kakaoUser:       null,
  loading:         true,
  profileComplete: null,
  nickname:        null,

  setUser:            (user)      => set({ user,      loading: false }),
  setKakaoUser:       (kakaoUser) => set({ kakaoUser, loading: false }),
  setLoading:         (loading)   => set({ loading }),
  setProfileComplete: (v)         => set({ profileComplete: v }),
  setNickname:        (nickname)  => set({ nickname }),

  isLoggedIn: () => !!(get().user || get().kakaoUser),
}));
