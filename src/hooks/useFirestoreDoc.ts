import { DocumentReference, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

/**
 * Firestore 문서를 실시간으로 구독하는 훅.
 * onSnapshot 리스너를 useEffect 안에서 등록하고 언마운트 시 자동 해제.
 *
 * 사용 예시:
 *   const { data, loading } = useFirestoreDoc<User>(doc(db, 'users', uid));
 *
 * 주의: 모든 onSnapshot 리스너는 반드시 이 패턴을 따를 것.
 * useEffect 안에서 unsubscribe를 return하지 않으면 메모리 누수 발생.
 *
 * DATA FLOW:
 *   mount → onSnapshot 등록
 *     ├── doc exists   → setData(doc.data()), setLoading(false)
 *     ├── doc missing  → setData(null), setLoading(false)
 *     └── error        → setError(err), setLoading(false)
 *   unmount → unsubscribe() 자동 호출
 */
export function useFirestoreDoc<T>(ref: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? (snap.data() as T) : null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe; // 반드시 return — 언마운트 시 리스너 해제
  }, [ref?.path]);

  return { data, loading, error };
}
