# j'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const OWNER_USER_ID = String(process.env.OWNER_USER_ID || '').trim();
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'junbari-players.json');
const MAX_BODY = 100000;

const JUNBARI_BAT = {
  name: '퉁퉁퉁 준바리의 방망이',
  attack: 777777,
  grade: '신화',
  skill: '퉁! 퉁! 퉁!'
};

const monsters = [
  { name:'젤리 슬라임', hp:250, atk:18, exp:45, gold:75, grade:'D', drop:'슬라임 젤리', image:'https://img2url.org/i/b343d259cd00e17ae019a249' },
  { name:'초록 고블린', hp:300, atk:22, exp:55, gold:90, grade:'D', drop:'고블린의 낡은 동전', image:'https://img2url.org/i/64c6ffebe59ccec1a31e30ca' },
  { name:'회색 늑대', hp:500, atk:50, exp:100, gold:150, grade:'C', drop:'늑대의 이빨', image:'https://img2url.org/i/17f460d88dfd59a895187dcc' },
  { name:'유령', hp:650, atk:60, exp:150, gold:220, grade:'C', drop:'유령의 가루', image:'https://img2url.org/i/b54145b5781ba0441409567c' },
  { name:'족전갈', hp:800, atk:75, exp:220, gold:300, grade:'B', drop:'전갈의 독침', image:'https://img2url.org/i/e09e48dd7f1ca2e4b41c78aa' },
  { name:'박쥐', hp:900, atk:85, exp:260, gold:350, grade:'B', drop:'박쥐의 날개', image:'https://img2url.org/i/ba8bda6a8842544b28d23c94' },
  { name:'좀비', hp:1200, atk:100, exp:350, gold:500, grade:'B', drop:'좀비의 썩은 이빨', image:'https://img2url.org/i/df8e53af57e35c22408d0961' },
  { name:'오우거', hp:1800, atk:130, exp:500, gold:750, grade:'A', drop:'오우거의 도끼 조각', image:'https://img2url.org/i/7b56dc724cf686f1865d2d25' },
  { name:'드래곤', hp:3000, atk:180, exp:900, gold:1400, grade:'S', drop:'드래곤의 비늘', image:'https://img2url.org/i/bd933b802bfe98fef05380c3' },
  { name:'어둠의 기사', hp:2500, atk:160, exp:750, gold:1100, grade:'A', drop:'어둠의 갑옷 조각', image:'https://img2url.org/i/e673ce538a7349f3b110ea9d' },
  { name:'예티', hp:2200, atk:145, exp:650, gold:950, grade:'A', drop:'예티의 털', image:'https://img2url.org/i/3f6b940e0004607e7cf6f272' },
  { name:'피닉스', hp:4000, atk:200, exp:1200, gold:1800, grade:'S', drop:'불사조의 깃털', image:'https://img2url.org/i/5d04a1d2088e82ab60a6eae8' }
];

function freshPlayer() {
  return {
    level:1, hp:100, maxHp:100, atk:20, exp:0,
    gold:100, monster:null, inventory:{}, weapon:null
  };
}

function normalizePlayer(p) {
  const d = freshPlayer();
  if (!p || typeof p !== 'object') return d;
  return {
    ...d, ...p,
    level: positiveInt(p.level, 1),
    hp: nonNegativeInt(p.hp, 100),
    maxHp: positiveInt(p.maxHp, 100),
    atk: positiveInt(p.atk, 20),
    exp: nonNegativeInt(p.exp, 0),
    gold: nonNegativeInt(p.gold, 100),
    inventory: p.inventory && typeof p.inventory === 'object' ? p.inventory : {},
    monster: p.monster && typeof p.monster === 'object' ? p.monster : null,
    weapon: p.weapon && typeof p.weapon === 'object' ? p.weapon : null
  };
}

function positiveInt(v, fallback) {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

function nonNegativeInt(v, fallback) {
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}let players = {};

try {
  if (fs.existsSync(DATA_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (loaded && typeof loaded === 'object') {
      for (const [id, p] of Object.entries(loaded)) {
        players[id] = normalizePlayer(p);
      }
    }
  }
} catch (err) {
  console.error('저장 데이터 읽기 실패:', err.message);
}

let saveTimer = null;

function savePlayers() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(players, null, 2), 'utf8');
      fs.renameSync(tmp, DATA_FILE);
    } catch (err) {
      console.error('저장 실패:', err.message);
    }
  }, 100);
}

function getPlayer(id) {
  if (!players[id]) {
    players[id] = freshPlayer();
    savePlayers();
  }
  return players[id];
}

function effectiveAtk(player) {
  return player.atk + (player.weapon ? player.weapon.attack : 0);
}

function reply(text, imageUrl = null) {
  if (imageUrl && /^https:\/\//i.test(imageUrl)) {
    return {
      version: '2.0',
      template: {
        outputs: [{
          basicCard: {
            title: '🐾 몬스터 발견!',
            description: String(text).slice(0, 230),
            thumbnail: { imageUrl }
          }
        }]
      }
    };
  }

  return {
    version: '2.0',
    template: {
      outputs: [{
        simpleText: { text: String(text).slice(0, 1000) }
      }]
    }
  };
}

function handleCommand(rawCommand, player, userId) {
  const command = String(rawCommand || '').trim();

  if (!command) {
    return '🐵 명령어를 입력해 줘! !명령어 를 입력하면 목록을 볼 수 있어.';
  }

  if (command === '!명령어' || command === '!도움말') {
    return [
      '🐵 준바리 RPG 명령어',
      '',
      '!사냥 - 몬스터 발견',
      '!공격 - 몬스터 공격',
      '!도망 - 전투에서 도망',
      '!내정보 - 캐릭터 정보',
      '!회복 - HP 전부 회복 (20골드)',
      '!가방 - 드랍템 확인',
      '!장비 - 장착 무기 확인',
      '!장착 방망이 - 전용 방망이 장착',
      '!준바리 - 소유자 전용 방망이 받기',
      '!명령어 - 명령어 목록'
    ].join('\n');
  }

  if (command === '!준바리') {
    if (!OWNER_USER_ID) {
      return '🔒 전용 아이템 설정이 아직 안 됐어. 서버 관리자가 OWNER_USER_ID를 설정해야 해.';
    }
    if (String(userId) !== OWNER_USER_ID) {
      return '🔒 이 명령어는 준바리 전용이야!';
    }
    if (player.inventory[JUNBARI_BAT.name]) {
      return '🐒 준바리의 신화 방망이는 이미 가방에 있어!';
    }

    player.inventory[JUNBARI_BAT.name] = 1;
    savePlayers();

    return `🌌 소유자 인증 성공!
🎁 ${JUNBARI_BAT.name} 획득!
⚔️ 공격력 +${JUNBARI_BAT.attack}
✨ 스킬: ${JUNBARI_BAT.skill}

!장착 방망이 를 입력해서 장착해 줘.`;
  }

  if (command === '!장착 방망이') {
    if (
      !OWNER_USER_ID ||
      String(userId) !== OWNER_USER_ID ||
      !player.inventory[JUNBARI_BAT.name]
    ) {
      return '🔒 장착할 수 있는 준바리 전용 방망이가 없어!';
    }

    player.weapon = { ...JUNBARI_BAT };
    savePlayers();

    return `⚔️ ${JUNBARI_BAT.name} 장착 완료!
공격력: ${effectiveAtk(player)}
✨ 스킬: ${JUNBARI_BAT.skill}`;
  }

  if (command === '!장비') {
    return player.weapon
      ? `⚔️ 장착 무기: ${player.weapon.name}
🗡️ 무기 공격력: +${player.weapon.attack}
💥 내 총 공격력: ${effectiveAtk(player)}
✨ 스킬: ${player.weapon.skill || '없음'}`
      : `⚔️ 장착한 무기가 없어!
기본 공격력: ${player.atk}`;
  }

  if (command === '!내정보') {
    return [
      '🐵 내 캐릭터 정보',
      '',
      `🎖️ 레벨: ${player.level}`,
      `❤️ HP: ${player.hp}/${player.maxHp}`,
      `⚔️ 공격력: ${effectiveAtk(player)}`,
      `🌟 EXP: ${player.exp}/${player.level * 100}`,
      `💰 골드: ${player.gold}`,
      `🗡️ 무기: ${player.weapon ? player.weapon.name : '기본 무기'}`
    ].join('\n');
  }

  if (command === '!가방') {
    const items = Object.entries(player.inventory);

    if (!items.length) {
      return '🎒 가방이 비어 있어!\n몬스터를 사냥해 드랍템을 얻어 봐.';
    }

    return '🎒 내 가방\n\n' +
      items.map(([name, count]) => `🎁 ${name} x${count}`).join('\n');
  }

  if (command === '!회복') {
    if (player.hp >= player.maxHp) {
      return '❤️ HP가 이미 가득 차 있어!';
    }
    if (player.gold < 20) {
      return '💰 골드가 부족해! 회복에는 20골드가 필요해.';
    }

    player.gold -= 20;
    player.hp = player.maxHp;
    savePlayers();

    return '✨ 회복 완료!\n❤️ HP가 전부 회복됐어!\n💰 -20골드';
  }

  if (const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: '준바리 RPG 서버 실행 중!',
      version: '1.1.0'
    }));
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end(JSON.stringify(reply('지원하지 않는 요청이야.')));
  }

  let body = '';
  let tooLarge = false;

  req.on('data', chunk => {
    body += chunk;

    if (body.length > MAX_BODY) {
      tooLarge = true;
      res.writeHead(413);
      res.end(JSON.stringify(reply('요청 내용이 너무 커!')));
      req.destroy();
    }
  });

  req.on('end', () => {
    if (tooLarge) return;

    try {
      const data = JSON.parse(body || '{}');
      const user = data.userRequest && data.userRequest.user;

      const id = String(
        (user && user.id) ||
        (user && user.properties && user.properties.plusfriendUserKey) ||
        'guest'
      );

      const command = String(
        (data.userRequest && data.userRequest.utterance) || ''
      ).trim();

      const player = getPlayer(id);
      const hadMonster = Boolean(player.monster);
      const message = handleCommand(command, player, id);

      const imageUrl =
        command === '!사냥' && !hadMonster && player.monster
          ? player.monster.image
          : null;

      res.writeHead(200);
      res.end(JSON.stringify(reply(message, imageUrl)));
    } catch (err) {
      console.error('요청 처리 오류:', err);

      if (!res.headersSent) res.writeHead(200);

      if (!res.writableEnded) {
        res.end(JSON.stringify(
          reply('앗! 오류가 발생했어. 다시 시도해 줘!')
        ));
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`준바리 RPG 서버 실행 중: ${PORT}`);
});unbari-RPG
