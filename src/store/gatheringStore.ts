import { create } from 'zustand';

export interface PendingRequest {
  uid: string;
  nickname: string;
  requestedAt: string;
}

export interface ApprovedMember {
  uid: string;
  nickname: string;
}

export interface GatheringEntry {
  id: string;
  type: 'flash' | 'regular';
  deadlineMs?: number; // flash only — unix ms; gathering is hidden after this
  participantCount: number;
  maxMembers: number;
  pendingRequests: PendingRequest[];
  approvedMembers: ApprovedMember[];
  rejections: Record<string, string>;
  hasChatRoom: boolean;
}

interface GatheringStore {
  gatherings: Record<string, GatheringEntry>;
  requestJoin: (gatheringId: string, uid: string, nickname: string) => void;
  cancelRequest: (gatheringId: string, uid: string) => void;
  approveRequest: (gatheringId: string, uid: string) => void;
  rejectRequest: (gatheringId: string, uid: string, reason: string) => void;
  createChatRoom: (gatheringId: string) => void;
}

export const useGatheringStore = create<GatheringStore>((set) => ({
  gatherings: {
    g0: {
      id: 'g0',
      type: 'flash',
      deadlineMs: Date.now() + 90 * 60 * 1000, // 90 minutes from now
      participantCount: 2,
      maxMembers: 5,
      pendingRequests: [],
      approvedMembers: [],
      rejections: {},
      hasChatRoom: false,
    },
    g1: {
      id: 'g1',
      type: 'regular',
      participantCount: 1,
      maxMembers: 8,
      pendingRequests: [
        { uid: 'user_a', nickname: '동네산책러', requestedAt: '10분 전' },
        { uid: 'user_b', nickname: '한강뷰러버', requestedAt: '5분 전' },
      ],
      approvedMembers: [],
      rejections: {},
      hasChatRoom: false,
    },
    g2: {
      id: 'g2',
      type: 'regular',
      participantCount: 2,
      maxMembers: 4,
      pendingRequests: [],
      approvedMembers: [],
      rejections: {},
      hasChatRoom: false,
    },
    g3: {
      id: 'g3',
      type: 'regular',
      participantCount: 3,
      maxMembers: 3,
      pendingRequests: [],
      approvedMembers: [],
      rejections: {},
      hasChatRoom: false,
    },
  },

  requestJoin: (gatheringId, uid, nickname) =>
    set((state) => {
      const g = state.gatherings[gatheringId];
      if (
        !g ||
        g.pendingRequests.some((r) => r.uid === uid) ||
        g.approvedMembers.some((m) => m.uid === uid)
      ) return state;
      return {
        gatherings: {
          ...state.gatherings,
          [gatheringId]: {
            ...g,
            pendingRequests: [...g.pendingRequests, { uid, nickname, requestedAt: '방금 전' }],
          },
        },
      };
    }),

  cancelRequest: (gatheringId, uid) =>
    set((state) => {
      const g = state.gatherings[gatheringId];
      if (!g) return state;
      return {
        gatherings: {
          ...state.gatherings,
          [gatheringId]: {
            ...g,
            pendingRequests: g.pendingRequests.filter((r) => r.uid !== uid),
          },
        },
      };
    }),

  approveRequest: (gatheringId, uid) =>
    set((state) => {
      const g = state.gatherings[gatheringId];
      if (!g) return state;
      const req = g.pendingRequests.find((r) => r.uid === uid);
      if (!req) return state;
      return {
        gatherings: {
          ...state.gatherings,
          [gatheringId]: {
            ...g,
            pendingRequests: g.pendingRequests.filter((r) => r.uid !== uid),
            approvedMembers: [...g.approvedMembers, { uid, nickname: req.nickname }],
            participantCount: g.participantCount + 1,
          },
        },
      };
    }),

  rejectRequest: (gatheringId, uid, reason) =>
    set((state) => {
      const g = state.gatherings[gatheringId];
      if (!g) return state;
      return {
        gatherings: {
          ...state.gatherings,
          [gatheringId]: {
            ...g,
            pendingRequests: g.pendingRequests.filter((r) => r.uid !== uid),
            rejections: {
              ...g.rejections,
              [uid]: reason.trim() || '모임 조건에 맞지 않아요',
            },
          },
        },
      };
    }),

  createChatRoom: (gatheringId) =>
    set((state) => {
      const g = state.gatherings[gatheringId];
      if (!g) return state;
      return {
        gatherings: {
          ...state.gatherings,
          [gatheringId]: { ...g, hasChatRoom: true },
        },
      };
    }),
}));
