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

  get battingTeam() {
    return this.half === '上' ? 0 : 1;
  }

  emit() {
    this.onChange(this.snapshot());
  }

  snapshot() {
    return {
      inning: this.inning,
      half: this.half,
      outs: this.outs,
      balls: this.balls,
      strikes: this.strikes,
      bases: [...this.bases],
      score: [...this.score],
      gameOver: this.gameOver,
      batterNumber: this.batterNumber,
      lastCall: this.lastCall
    };
  }

  call(text) {
    this.lastCall = text;
    this.emit();
  }

  isWalkOff() {
    return this.half === '下' &&
      this.inning >= 9 &&
      this.score[1] > this.score[0];
  }

  finishWalkOff(reason) {
    if (!this.isWalkOff()) return false;
    this.gameOver = true;
    this.lastCall = reason;
    this.emit();
    return true;
  }

  addOut(reason) {
    if (this.gameOver) return;
    this.outs += 1;
    this.balls = 0;
    this.strikes = 0;

    if (this.outs >= 3) {
      this.endHalf();
      return;
    }

    this.lastCall = reason;
    this.emit();
  }

  endHalf() {
    this.outs = 0;
    this.balls = 0;
    this.strikes = 0;
    this.bases = [false, false, false];

    if (this.half === '上') {
      this.half = '下';
      if (this.inning >= 9 && this.score[1] > this.score[0]) {
        this.gameOver = true;
        this.lastCall = '九局上結束，主隊領先，比賽結束';
      } else {
        this.lastCall = `${this.inning} 局上結束，交換攻守`;
      }
    } else if (this.inning >= 9 && this.score[0] !== this.score[1]) {
      this.gameOver = true;
      this.lastCall = this.score[1] > this.score[0]
        ? '比賽結束，主隊獲勝'
        : '比賽結束，客隊獲勝';
    } else {
      this.inning += 1;
      this.half = '上';
      this.lastCall = this.inning > 9
        ? `進入第 ${this.inning} 局延長賽`
        : `進入第 ${this.inning} 局`;
    }

    this.emit();
  }

  pitch({ inZone, swung = false, contact = false, result = 'single', aggressive = false } = {}) {
    if (this.gameOver) return;

    if (contact) {
      this.hit(result, aggressive);
      return;
    }

    if (swung) {
      this.strikes += 1;
      if (this.strikes >= 3) {
        this.batterNumber += 1;
        this.addOut('三振出局');
      } else {
        this.call('揮棒落空，好球');
      }
      return;
    }

    if (inZone) {
      this.strikes += 1;
      if (this.strikes >= 3) {
        this.batterNumber += 1;
        this.addOut('三振出局');
      } else {
        this.call('好球');
      }
      return;
    }

    this.balls += 1;
    if (this.balls >= 4) {
      this.walk();
    } else {
      this.call('壞球');
    }
  }

  steal(baseIndex, success) {
    if (this.gameOver) return false;
    if (!Number.isInteger(baseIndex) || baseIndex < 0 || baseIndex > 2) return false;
    if (!this.bases[baseIndex]) {
      this.lastCall = '該壘沒有跑者，無法發動盜壘';
      this.emit();
      return false;
    }
    if (baseIndex < 2 && this.bases[baseIndex + 1]) {
      this.lastCall = '前方壘包已有跑者，無法盜壘';
      this.emit();
      return false;
    }

    this.bases[baseIndex] = false;
    if (!success) {
      this.addOut('盜壘失敗，跑者遭觸殺出局');
      return false;
    }

    if (baseIndex === 2) {
      this.score[this.battingTeam] += 1;
      this.lastCall = '盜本壘成功，跑者得分！';
    } else {
      this.bases[baseIndex + 1] = true;
      this.lastCall = baseIndex === 0 ? '盜上二壘成功！' : '盜上三壘成功！';
    }

    if (this.isWalkOff()) {
      this.gameOver = true;
      this.lastCall = '再見盜本壘！主隊獲勝';
    }
    this.emit();
    return true;
  }

  walk() {
    if (this.gameOver) return;
    const [first, second, third] = this.bases;
    const runs = first && second && third ? 1 : 0;

    // Only forced runners advance. A runner on third scores only when all bases are loaded.
    this.bases = [
      true,
      second || first,
      third || (first && second)
    ];
    this.score[this.battingTeam] += runs;
    this.balls = 0;
    this.strikes = 0;
    this.batterNumber += 1;
    this.lastCall = '四壞球保送';

    if (this.isWalkOff()) {
      this.gameOver = true;
      this.lastCall = '再見保送！主隊獲勝';
    }
    this.emit();
  }

  hit(kind = 'single', aggressive = false) {
    if (this.gameOver) return;
    const [first, second, third] = this.bases;
    let runs = 0;

    switch (kind) {
      case 'homer':
        runs = 1 + this.bases.filter(Boolean).length;
        this.bases = [false, false, false];
        break;
      case 'triple':
        runs = this.bases.filter(Boolean).length;
        this.bases = [false, false, true];
        break;
      case 'double':
        runs = Number(second) + Number(third) + Number(aggressive && first);
        this.bases = [false, true, aggressive ? false : first];
        break;
      case 'single':
      default:
        runs = Number(third) + Number(aggressive && second);
        this.bases = [true, first, aggressive ? false : second];
        break;
    }

    this.score[this.battingTeam] += runs;
    this.balls = 0;
    this.strikes = 0;
    this.batterNumber += 1;

    const labels = {
      single: '一壘安打！',
      double: '二壘安打！',
      triple: '三壘安打！',
      homer: '全壘打！'
    };
    this.lastCall = labels[kind] || labels.single;

    if (this.isWalkOff()) {
      this.gameOver = true;
      this.lastCall = kind === 'homer'
        ? '再見全壘打！主隊獲勝'
        : '再見安打！主隊獲勝';
    }
    this.emit();
  }

  foul() {
    if (this.gameOver) return;
    if (this.strikes < 2) this.strikes += 1;
    this.call('界外球');
  }

  sacrificeFly() {
    if (this.gameOver) return;
    if (this.outs < 2 && this.bases[2]) {
      this.score[this.battingTeam] += 1;
      this.bases[2] = false;
    }
    this.batterNumber += 1;
    this.addOut('高飛犧牲打');
    this.finishWalkOff('再見高飛犧牲打！主隊獲勝');
  }

  error() {
    if (this.gameOver) return;
    this.hit('single');
    this.lastCall = this.isWalkOff()
      ? '再見失誤！主隊獲勝'
      : '守備失誤，打者上壘';
    this.emit();
  }
}
