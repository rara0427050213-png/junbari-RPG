'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const OWNER_USER_ID = String(process.env.OWNER_USER_ID || '').trim();
const MAX_BODY = 100000;
const DATA_FILE = process.env.DATA_FILE ||
  path.join(__dirname, 'junbari-players.json');

const JUNBARI_BAT = {
  name: '퉁퉁퉁 준바리의 방망이',
  attack: 777777,
  grade: '신화',
  skill: '퉁! 퉁! 퉁!'
};

const monsters = [
  {
    name: '젤리 슬라임',
    hp: 250, atk: 18, exp: 45, gold: 75, grade: 'D',
    drop: '슬라임 젤리',
    image: 'https://img2url.org/i/b343d259cd00e17ae019a249'
  },
  {
    name: '초록 고블린',
    hp: 300, atk: 22, exp: 55, gold: 90, grade: 'D',
    drop: '고블린의 낡은 동전',
    image: 'https://img2url.org/i/64c6ffebe59ccec1a31e30ca'
  },
  {
    name: '회색 늑대',
    hp: 500, atk: 50, exp: 100, gold: 150, grade: 'C',
    drop: '늑대의 이빨',
    image: 'https://img2url.org/i/17f460d88dfd59a895187dcc'
  },
  {
    name: '유령',
    hp: 650, atk: 60, exp: 150, gold: 220, grade: 'C',
    drop: '유령의 가루',
    image: 'https://img2url.org/i/b54145b5781ba0441409567c'
  },
  {
    name: '족전갈',
    hp: 800, atk: 75, exp: 220, gold: 300, grade: 'B',
    drop: '전갈의 독침',
    image: 'https://img2url.org/i/e09e48dd7f1ca2e4b41c78aa'
  },
  {
    name: '박쥐',
    hp: 900, atk: 85, exp: 260, gold: 350, grade: 'B',
    drop: '박쥐의 날개',
    image: 'https://img2url.org/i/ba8bda6a8842544b28d23c94'
  },
  {
    name: '좀비',
    hp: 1200, atk: 100, exp: 350, gold: 500, grade: 'B',
    drop: '좀비의 썩은 이빨',
    image: 'https://img2url.org/i/df8e53af57e35c22408d0961'
  },
  {
    name: '오우거',
    hp: 1800, atk: 130, exp: 500, gold: 750, grade: 'A',
    drop: '오우거의 도끼 조각',
    image: 'https://img2url.org/i/7b56dc724cf686f1865d2d25'
  },
  {
    name: '드래곤',
    hp: 3000, atk: 180, exp: 900, gold: 1400, grade: 'S',
    drop: '드래곤의 비늘',
    image: 'https://img2url.org/i/bd933b802bfe98fef05380c3'
  },
  {
    name: '어둠의 기사',
    hp: 2500, atk: 160, exp: 750, gold: 1100, grade: 'A',
    drop: '어둠의 갑옷 조각',
    image: 'https://img2url.org/i/e673ce538a7349f3b110ea9d'
  },
  {
    name: '예티',
    hp: 2200, atk: 145, exp: 650, gold: 950, grade: 'A',
    drop: '예티의 털',
    image: 'https://img2url.org/i/3f6b940e0004607e7cf6f272'
  },
  {
    name: '피닉스',
    hp: 4000, atk: 200, exp: 1200, gold: 1800, grade: 'S',
    drop: '불사조의 깃털',
    image: 'https://img2url.org/i/5d04a1d2088e82ab60a6eae8'
  }
];

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

function nonNegativeInt(value, fallback) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}

function freshPlayer() {
  return {
    level: 1,
    hp: 100,
    maxHp: 100,
    atk: 20,
    exp: 0,
    gold: 100,
    inventory: {},
    monster: null,
    weapon: null
  };
}

function normalizePlayer(p) {
  const d = freshPlayer();

  if (!p || typeof p !== 'object') {
    return d;
  }

  return {
    ...d,
    ...p,
    level: positiveInt(p.level, 1),
    hp: nonNegativeInt(p.hp, 100),
    maxHp: positiveInt(p.maxHp, 100),
    atk: positiveInt(p.atk, 20),
    exp: nonNegativeInt(p.exp, 0),
    gold: nonNegativeInt(p.gold, 100),
    inventory:
      p.inventory && typeof p.inventory === 'object'
        ? p.inventory
        : {},
    monster:
      p.monster && typeof p.monster === 'object'
        ? p.monster
        : null,
    weapon:
      p.weapon && typeof p.weapon === 'object'
        ? p.weapon
        : null
  };
}

let players = {};

try {
  if (fs.existsSync(DATA_FILE)) {
    const loaded = JSON.parse(
      fs.readFileSync(DATA_FILE, 'utf8')
    );

    if (loaded && typeof loaded === 'object') {
      for (const [id, player] of Object.entries(loaded)) {
        players[id] = normalizePlayer(player);
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
    const tempFile = DATA_FILE + '.tmp';

    try {
      fs.mkdirSync(path.dirname(DATA_FILE), {
        recursive: true
      });

      fs.writeFileSync(
        tempFile,
        JSON.stringify(players, null, 2),
        'utf8'
      );

      fs.renameSync(tempFile, DATA_FILE);
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
  return player.atk +
    (player.weapon ? player.weapon.attack : 0);
}

function addItem(player, name, count = 1) {
  player.inventory[name] =
    (player.inventory[name] || 0) + count;
}

function removeItem(player, name, count = 1) {
  if (!player.inventory[name] ||
      player.inventory[name] < count) {
    return false;
  }

  player.inventory[name] -= count;

  if (player.inventory[name] <= 0) {
    delete player.inventory[name];
  }

  return true;
}

function reply(text, imageUrl = null) {
  const safeText = String(text).slice(0, 1000);

  if (
    imageUrl &&
    /^https:\/\//i.test(imageUrl)
  ) {
    return {
      version: '2.0',
      template: {
        outputs: [{
          basicCard: {
            title: '🐾 몬스터 발견!',
            description: safeText.slice(0, 230),
            thumbnail: {
              imageUrl: imageUrl
            }
          }
        }]
      }
    };
  }

  return {
    version: '2.0',
    template: {
      outputs: [{
        simpleText: {
          text: safeText
        }
      }]
    }
  };
}

function handleCommand(rawCommand, player, userId) {
  const command = String(rawCommand || '').trim();

  if (!command) {
    return '🐵 명령어를 입력해 줘! !명령어 를 입력해 봐.';
  }

  if (command === '!명령어' || command === '!도움말') {
    return [
      '🐵 준바리 RPG 명령어',
      '',
      '!사냥 - 몬스터 발견',
      '!공격 - 몬스터 공격',
      '!도망 - 전투에서 도망',
      '!내정보 - 캐릭터 정보',
      '!회복 - HP 회복 (20골드)',
      '!가방 - 보유 아이템 확인',
      '!장비 - 장착 무기 확인',
      '!장착 방망이 - 전용 방망이 장착',
      '!준바리 - 소유자 전용 방망이 받기',
      '!명령어 - 명령어 목록'
    ].join('\n');
  }

  if (command === '!준바리') {
    if (
      !OWNER_USER_ID ||
      String(userId) !== OWNER_USER_ID
    ) {
      return '🔒 이 명령어는 준바리 전용이야!';
    }

    if (player.inventory[JUNBARI_BAT.name]) {
      return '🐒 신화 방망이는 이미 가방에 있어!';
    }

    addItem(player, JUNBARI_BAT.name);

    savePlayers();

    return [
      '🌌 소유자 인증 성공!',
      '',
      '🎁 ' + JUNBARI_BAT.name + ' 획득!',
      '⚔️ 공격력 +' + JUNBARI_BAT.attack,
      '✨ 스킬: ' + JUNBARI_BAT.skill,
      '',
      '!장착 방망이 를 입력해서 장착해 줘.'
    ].join('\n');
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

    return [
      '⚔️ 신화 방망이 장착 완료!',
      '🗡️ 총 공격력: ' + effectiveAtk(player),
      '✨ 스킬: ' + JUNBARI_BAT.skill
    ].join('\n');
  }

  if (command === '!장비') {
    if (!player.weapon) {
      return [
        '⚔️ 장착한 무기가 없어!',
        '기본 공격력: ' + player.atk
      ].join('\n');
    }

    return [
      '⚔️ 장착 무기: ' + player.weapon.name,
      '🗡️ 무기 공격력: +' + player.weapon.attack,
      '💥 총 공격력: ' + effectiveAtk(player),
      '✨ 스킬: ' + (player.weapon.skill || '없음')
    ].join('\n');
  }

  if (command === '!내정보') {
    return [
      '🐵 내 캐릭터 정보',
      '',
      '🎖️ 레벨: ' + player.level,
      '❤️ HP: ' + player.hp + '/' + player.maxHp,
      '⚔️ 공격력: ' + effectiveAtk(player),
      '🌟 EXP: ' + player.exp + '/' + player.level * 100,
      '💰 골드: ' + player.gold,
      '🗡️ 무기: ' +
        (player.weapon ? player.weapon.name : '기본 무기')
    ].join('\n');
  }

  if (command === '!가방') {
    const items = Object.entries(player.inventory);

    if (!items.length) {
      return '🎒 가방이 비어 있어!\n몬스터를 사냥해 아이템을 얻어 봐.';
    }

    return '🎒 내 가방\n\n' +
      items.map(([name, count]) =>
        '🎁 ' + name + ' x' + count
      ).join('\n');
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

    return [
      '✨ 회복 완료!',
      '❤️ HP: ' + player.hp + '/' + player.maxHp,
      '💰 -20골드'
    ].join('\n');
  }

  if (command === '!사냥') {
    if (player.monster) {
      return '⚔️ 이미 ' + player.monster.name +
        '과 전투 중이야!\n!공격 또는 !도망을 입력해 줘.';
    }

    const maxIndex = Math.min(
      monsters.length,
      Math.max(1, Math.floor(player.level / 2) + 2)
    );

    const monster = monsters[
      Math.floor(Math.random() * maxIndex)
    ];

    player.monster = {
      ...monster,
      currentHp: monster.hp
    };

    savePlayers();

    return [
      '👹 몬스터 발견!',
      '',
      '이름: ' + monster.name,
      '🎖️ 등급: ' + monster.grade,
      '❤️ HP: ' + monster.hp,
      '⚔️ 공격력: ' + monster.atk,
      '🌟 EXP: ' + monster.exp,
      '💰 골드: ' + monster.gold,
      '🎁 드랍템: ' + monster.drop,
      '',
      '!공격 또는 !도망'
    ].join('\n');
  }

  if (command === '!공격') {
    if (!player.monster) {
      return '❌ 싸울 몬스터가 없어! 먼저 !사냥을 입력해 줘.';
    }

    const monster = player.monster;
    monster.currentHp -= effectiveAtk(player);

    const lines = [
      '⚔️ ' + monster.name + '에게 ' +
        effectiveAtk(player) + '의 피해!'
    ];

    if (monster.currentHp <= 0) {
      player.exp += monster.exp;
      player.gold += monster.gold;
      addItem(player, monster.drop);

      lines.push('');
      lines.push('🎉 ' + monster.name + ' 처치 성공!');
      lines.push('🌟 경험치 +' + monster.exp);
      lines.push('💰 골드 +' + monster.gold);
      lines.push('🎁 획득: ' + monster.drop);

      player.monster = null;

      while (player.exp >= player.level * 100) {
        player.exp -= player.level * 100;
        player.level += 1;
        player.maxHp += 20;
        player.atk += 5;
        player.hp = player.maxHp;

        lines.push('');
        lines.push('🆙 레벨 업! 현재 레벨: ' + player.level);
        lines.push('❤️ 최대 HP +20');
        lines.push('⚔️ 기본 공격력 +5');
      }

      savePlayers();

      return lines.join('\n');
    }

    player.hp -= monster.atk;

    lines.push('👹 몬스터 남은 HP: ' + monster.currentHp);
    lines.push('💥 몬스터 반격! HP -' + monster.atk);

    if (player.hp <= 0) {
      player.hp = player.maxHp;
      player.monster = null;

      lines.push('');
      lines.push('💫 전투에서 쓰러졌어!');
      lines.push('🏥 HP를 회복하고 마을로 돌아왔어.');
    } else {
      lines.push('❤️ 내 HP: ' + player.hp + '/' + player.maxHp);
    }

    savePlayers();

    return lines.join('\n');
  }

  if (command === '!도망') {
    if (!player.monster) {
      return '🏃 지금은 전투 중이 아니야!';
    }

    const name = player.monster.name;
    player.monster = null;

    savePlayers();

    return '🏃 ' + name + '에게서 도망쳤어!';
  }

  return '❓ 모르는 명령어야!\n!명령어를 입력해 줘.';
}

const server = http.createServer((req, res) => {
  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

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

    return res.end(JSON.stringify(
      reply('지원하지 않는 요청이야.')
    ));
  }

  let body = '';
  let tooLarge = false;

  req.on('data', chunk => {
    if (tooLarge) return;

    body += chunk.toString('utf8');

    if (Buffer.byteLength(body, 'utf8') > MAX_BODY) {
      tooLarge = true;

      res.writeHead(413);
      res.end(JSON.stringify(
        reply('요청 내용이 너무 커!')
      ));
    }
  });

  req.on('end', () => {
    if (tooLarge || res.writableEnded) return;

    try {
      const data = JSON.parse(body || '{}');
      const request = data.userRequest || {};
      const user = request.user || {};

      const id = String(
        user.id ||
        (user.properties && user.properties.plusfriendUserKey) ||
        'guest'
      );

      const command = String(request.utterance || '').trim();
      const player = getPlayer(id);
      const hadMonster = Boolean(player.monster);

      const message = handleCommand(command, player, id);

      const imageUrl =
        command === '!사냥' &&
        !hadMonster &&
        player.monster
          ? player.monster.image
          : null;

      res.writeHead(200);

      res.end(JSON.stringify(reply(message, imageUrl)));
    } catch (err) {
      console.error('요청 처리 오류:', err);

      if (!res.headersSent) {
        res.writeHead(200);
      }

      if (!res.writableEnded) {
        res.end(JSON.stringify(
          reply('앗! 오류가 발생했어. 다시 시도해 줘!')
        ));
      }
    }
  });

  req.on('error', err => {
    console.error('요청 읽기 오류:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('준바리 RPG 서버 실행 중: ' + PORT);
});
