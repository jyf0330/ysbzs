# TDD 执行计划：第1步 — 敌方城堡

## Step 1: RED — 写失败测试

### 测试1：城堡初始值
```js
group('城堡系统', ()=>{
  test('敌方城堡 HP=100，位置在右侧', ()=>{
    fresh();
    assert.strictEqual(G.castle.hp, 100);
    assert.strictEqual(G.castle.maxHp, 100);
    // 右侧：c > 6（棋盘中间偏右）
    assert.ok(G.castle.pos.c > 6, '城堡应在右侧');
  });
});
```
预期：❌ RED — 当前 `hp:30, maxHp:30, pos:{r:12,c:1}`

### 测试2：城堡被摧毁 = 胜利
```js
  test('城堡HP≤0 → 胜利（不是失败）', ()=>{
    fresh();
    G.castle.hp = 0;
    checkGameOver();
    assert.strictEqual(G.phase, 'OVER');
    assert.ok(_lastMsg.includes('胜利') || _lastMsg.includes('摧毁'),
      '应显示胜利信息');
  });
```
预期：❌ RED — 当前判断城堡被毁=失败

### 测试3：城堡不可被英雄/怪物站在上面
```js
  test('城堡格不可被英雄移动占用', ()=>{
    fresh();
    const hero = Object.values(G.heroes)[0];
    G.selHero = hero.id;
    moveHero(G.castle.pos.r, G.castle.pos.c);
    // 英雄位置不应改变到城堡格
    assert.notDeepStrictEqual(hero.pos, G.castle.pos);
  });
});
```
预期：❌ RED — 当前城堡在左下角，通常不会踩到。移右侧后英雄可能踩。

## Step 2: GREEN — 实现

1. `initGame()` 改 `castle:{hp:100, maxHp:100, pos:{r:6,c:11}}`
2. `checkGameOver()` 改城堡判定为胜利
3. `moveHero()` 确认城堡格已被 cellFree 拦截（城堡格当作不可占用）

## Step 3: 跑全量测试确认
```
node test.js  →  当前256通过 + 新增3通过 = 259通过
```
