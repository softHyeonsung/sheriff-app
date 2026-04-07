import { Timestamp, GeoPoint } from 'firebase/firestore';

export type AuthProvider = 'kakao' | 'apple' | 'google' | 'email';

export interface User {
  uid: string;
  nickname: string;
  email: string;
  provider: AuthProvider;
  profile_img: string;
  points: number;
  sheriff_score: number;
  badge_list: string[];
  saved_places: string[];
  followers: string[];
  following: string[];
  rank_level: string;
  home_location?: GeoPoint;
  home_address?: string;
  is_home_verified: boolean;
  createdAt: Timestamp;
}
