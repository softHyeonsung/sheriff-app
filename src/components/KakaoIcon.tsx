// Kakao talk logo — official speech bubble shape, no letter
import React from 'react';
import { Path, Svg } from 'react-native-svg';

export default function KakaoIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* KakaoTalk speech bubble: oval body + downward tail */}
      <Path
        d="M12 3C6.925 3 2.857 6.358 2.857 10.5c0 2.674 1.607 5.02 4.04 6.433l-.96 3.56a.3.3 0 0 0 .453.327l4.018-2.678C10.89 18.048 11.44 18.071 12 18.071c5.075 0 9.143-3.358 9.143-7.571C21.143 6.358 17.075 3 12 3z"
        fill="#3C1E1E"
      />
    </Svg>
  );
}
