/**
 * 일회성 마이그레이션 스크립트
 * "익명"으로 저장된 게시물의 author_nickname을 실제 닉네임으로 교체합니다.
 *
 * 실행 방법:
 *   1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
 *   2. 다운로드한 JSON 파일을 scripts/service-account-key.json 으로 저장
 *   3. npm install firebase-admin  (한 번만)
 *   4. node scripts/fix-anonymous-posts.js
 */

const admin = require('firebase-admin');
const path  = require('path');

const KEY_PATH = path.join(__dirname, 'service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(require(KEY_PATH)),
});

const db = admin.firestore();

// Firestore batch 최대 500건 제한 처리
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  console.log('🔍 author_nickname = "익명" 게시물 조회 중...');

  const postsSnap = await db.collection('posts')
    .where('author_nickname', '==', '익명')
    .get();

  if (postsSnap.empty) {
    console.log('✅ 수정할 게시물이 없습니다.');
    return;
  }

  console.log(`📄 ${postsSnap.size}개 게시물 발견`);

  // 고유 author_id 목록
  const authorIds = [...new Set(postsSnap.docs.map(d => d.data().author_id))];
  console.log(`👤 고유 작성자 ${authorIds.length}명 조회 중...`);

  // users/{uid}.nickname 일괄 조회
  const nicknameMap = new Map();
  await Promise.all(
    authorIds.map(async (authorId) => {
      try {
        const userSnap = await db.collection('users').doc(authorId).get();
        if (userSnap.exists) {
          const nick = userSnap.data().nickname;
          if (nick && nick !== '익명') {
            nicknameMap.set(authorId, nick);
          }
        }
      } catch (e) {
        console.warn(`  ⚠️  ${authorId} 조회 실패:`, e.message);
      }
    })
  );

  console.log(`✏️  닉네임을 찾은 작성자: ${nicknameMap.size}/${authorIds.length}명`);

  // 업데이트 대상 문서 필터링
  const toUpdate = postsSnap.docs.filter(doc =>
    nicknameMap.has(doc.data().author_id)
  );

  if (toUpdate.length === 0) {
    console.log('❌ Firestore users 문서에서 닉네임을 찾을 수 없습니다.');
    return;
  }

  // 500개 단위로 배치 커밋
  const chunks = chunkArray(toUpdate, 500);
  let updated = 0;

  for (const chunk of chunks) {
    const batch = db.batch();
    for (const doc of chunk) {
      const authorId = doc.data().author_id;
      batch.update(doc.ref, { author_nickname: nicknameMap.get(authorId) });
    }
    await batch.commit();
    updated += chunk.length;
    console.log(`  ✅ ${updated}/${toUpdate.length} 완료`);
  }

  console.log(`\n🎉 완료: ${updated}개 게시물 닉네임 교체됨`);

  // 댓글 author_nickname도 수정
  console.log('\n🔍 댓글(comments) 도 확인 중...');
  let commentFixed = 0;

  for (const postDoc of postsSnap.docs) {
    const commentsSnap = await db
      .collection('posts').doc(postDoc.id)
      .collection('comments')
      .where('author_nickname', '==', '익명')
      .get();

    if (commentsSnap.empty) continue;

    const chunks2 = chunkArray(commentsSnap.docs, 500);
    for (const chunk of chunks2) {
      const batch = db.batch();
      for (const commentDoc of chunk) {
        const authorId = commentDoc.data().author_id;
        const nick = nicknameMap.get(authorId);
        if (nick) {
          batch.update(commentDoc.ref, { author_nickname: nick });
          commentFixed++;
        }
      }
      await batch.commit();
    }
  }

  if (commentFixed > 0) {
    console.log(`✅ 댓글 ${commentFixed}개 닉네임 교체됨`);
  } else {
    console.log('댓글은 수정할 항목이 없습니다.');
  }
}

main().catch((e) => {
  console.error('❌ 오류:', e);
  process.exit(1);
});
