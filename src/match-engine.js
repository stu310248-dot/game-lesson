export class MatchEngine {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.reset();
  }
  reset() {
    this.inning = 1;
    this.half = '上';
    this.outs = 0;
    this.balls = 0;
    this.strikes = 0;
    this.bases = [false, false, false];
    this.score = [0, 0];
    this.gameOver = false;
    this.batterNumber = 1;
    this.lastCall = '比賽開始';
    this.emit();
  }
  get battingTeam() { return this.half === '上' ? 0 : 1; }
  emit() { this.onChange(this.snapshot()); }
  snapshot() {
    return {
      inning: this.inning, half: this.half, outs: this.outs,
      balls: this.balls, strikes: this.strikes,
      bases: [...this.bases], score: [...this.score],
      gameOver: this.gameOver, batterNumber: this.batterNumber,
      lastCall: this.lastCall
    };
  }
  call(text) { this.lastCall = text; this.emit(); }
  addOut(reason) {
    this.outs++;
    this.balls = 0; this.strikes = 0;
    this.lastCall = reason;
    if (this.outs >= 3) this.endHalf();
    else this.emit();
  }
  endHalf() {
    this.outs = 0; this.balls = 0; this.strikes = 0;
    this.bases = [false, false, false];
    if (this.half === '上') {
      this.half = '下';
      if (this.inning >= 9 && this.score[1] > this.score[0]) {
        this.gameOver = true; this.lastCall = '九局下半無須進攻，主隊獲勝';
      } else this.lastCall = `${this.inning} 局上結束，交換攻守`;
    } else {
      if (this.inning >= 9 && this.score[0] !== this.score[1]) {
        this.gameOver = true; this.lastCall = this.score[1] > this.score[0] ? '比賽結束，主隊獲勝' : '比賽結束，客隊獲勝';
      } else {
        this.inning++;
        this.half = '上';
        this.lastCall = this.inning > 9 ? '進入延長賽' : `進入第 ${this.inning} 局`;
      }
    }
    this.emit();
  }
  pitch({ inZone, swung = false, contact = false, result = 'out' } = {}) {
    if (this.gameOver) return;
    if (contact) { this.hit(result); return; }
    if (swung) {
      this.strikes++;
      if (this.strikes >= 3) {
        this.batterNumber++;
        this.addOut('三振出局');
      } else this.call('揮棒落空，好球');
      return;
    }
    if (inZone) {
      this.strikes++;
      if (this.strikes >= 3) {
        this.batterNumber++;
        this.addOut('三振出局');
      } else this.call('好球');
    } else {
      this.balls++;
      if (this.balls >= 4) this.walk();
      else this.call('壞球');
    }
  }
  walk() {
    const b = this.bases;
    if (b[0] && b[1] && b[2]) this.score[this.battingTeam]++;
    if (b[0] && b[1]) b[2] = true;
    if (b[0]) b[1] = true;
    b[0] = true;
    this.balls = 0; this.strikes = 0; this.batterNumber++;
    this.call('四壞球保送');
  }
  hit(kind = 'single') {
    const b = this.bases;
    let runs = 0;
    if (kind === 'homer') {
      runs = 1 + b.filter(Boolean).length;
      this.bases = [false, false, false];
    } else if (kind === 'triple') {
      runs = b.filter(Boolean).length;
      this.bases = [false, false, true];
    } else if (kind === 'double') {
      if (b[2]) runs++;
      if (b[1]) runs++;
      if (b[0]) runs++;
      this.bases = [false, false, true];
    } else {
      if (b[2]) runs++;
      if (b[1]) runs++;
      this.bases = [true, b[0], false];
    }
    this.score[this.battingTeam] += runs;
    this.balls = 0; this.strikes = 0; this.batterNumber++;
    this.call(kind === 'homer' ? '全壘打！' : kind === 'triple' ? '三壘安打！' : kind === 'double' ? '二壘安打！' : '一壘安打！');
    if (this.half === '下' && this.inning >= 9 && this.score[1] > this.score[0]) {
      this.gameOver = true; this.lastCall = '再見安打！主隊獲勝'; this.emit();
    }
  }
  foul() {
    if (this.strikes < 2) this.strikes++;
    this.call('界外球');
  }
  sacrificeFly() {
    if (this.bases[2]) { this.score[this.battingTeam]++; this.bases[2] = false; }
    this.batterNumber++;
    this.addOut('高飛犧牲打');
  }
  error() { this.hit('single'); this.lastCall = '守備失誤，打者上壘'; this.emit(); }
}
