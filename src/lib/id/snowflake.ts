// Ported from Doraemon/doraemon-nodejs/utils/SnowFlakeIdGenerator.js
// (originally from https://github.com/yitter/idgenerator)

export type SnowflakeOptions = {
  Method?: 1 | 2;
  BaseTime?: number;
  WorkerId: number;
  WorkerIdBitLength?: number;
  SeqBitLength?: number;
  MaxSeqNumber?: number;
  MinSeqNumber?: number;
  TopOverCostCount?: number;
};

export class SnowflakeId {
  private Method: bigint;
  private BaseTime: bigint;
  private WorkerId: bigint;
  private WorkerIdBitLength: bigint;
  private SeqBitLength: bigint;
  private MaxSeqNumber: bigint;
  private MinSeqNumber: bigint;
  private TopOverCostCount: bigint;

  private _TimestampShift: bigint;
  private _CurrentSeqNumber: bigint;

  private _LastTimeTick = 0n;
  private _TurnBackTimeTick = 0n;
  private _TurnBackIndex = 0n;
  private _IsOverCost = false;
  private _OverCostCountInOneTerm = 0n;

  constructor(options: SnowflakeOptions) {
    if (options.WorkerId === undefined) throw new Error("lost WorkerId");

    const baseTime = 1577836800000; // 2020-01-01
    const workerIdBitLength = 6;
    const seqBitLength = 6;
    const minSeqNumber = 5;
    const topOverCostCount = 2000;

    const method = options.Method === 2 ? 2 : 1;
    const base = options.BaseTime && options.BaseTime > 0 ? options.BaseTime : baseTime;
    const workerBits =
      options.WorkerIdBitLength && options.WorkerIdBitLength > 0
        ? options.WorkerIdBitLength
        : workerIdBitLength;
    const seqBits =
      options.SeqBitLength && options.SeqBitLength > 0 ? options.SeqBitLength : seqBitLength;

    const maxSeqDefault = (1 << seqBits) - 1;
    const maxSeq =
      options.MaxSeqNumber && options.MaxSeqNumber > 0 ? options.MaxSeqNumber : maxSeqDefault;
    const minSeq =
      options.MinSeqNumber && options.MinSeqNumber > 0 ? options.MinSeqNumber : minSeqNumber;
    const topOver =
      options.TopOverCostCount && options.TopOverCostCount > 0
        ? options.TopOverCostCount
        : topOverCostCount;

    this.Method = BigInt(method);
    this.BaseTime = BigInt(base);
    this.WorkerId = BigInt(options.WorkerId);
    this.WorkerIdBitLength = BigInt(workerBits);
    this.SeqBitLength = BigInt(seqBits);
    this.MaxSeqNumber = BigInt(maxSeq);
    this.MinSeqNumber = BigInt(minSeq);
    this.TopOverCostCount = BigInt(topOver);

    this._TimestampShift = this.WorkerIdBitLength + this.SeqBitLength;
    this._CurrentSeqNumber = this.MinSeqNumber;
  }

  private getCurrentTimeTick() {
    const millis = BigInt(Date.now());
    return millis - this.BaseTime;
  }

  private getNextTimeTick() {
    let tick = this.getCurrentTimeTick();
    while (tick <= this._LastTimeTick) tick = this.getCurrentTimeTick();
    return tick;
  }

  private calcId(useTimeTick: bigint) {
    const result =
      (useTimeTick << this._TimestampShift) +
      (this.WorkerId << this.SeqBitLength) +
      this._CurrentSeqNumber;
    this._CurrentSeqNumber++;
    return result;
  }

  private calcTurnBackId(useTimeTick: bigint) {
    const result =
      (useTimeTick << this._TimestampShift) +
      (this.WorkerId << this.SeqBitLength) +
      this._TurnBackIndex;
    this._TurnBackTimeTick--;
    return result;
  }

  private nextOverCostId() {
    const currentTimeTick = this.getCurrentTimeTick();
    if (currentTimeTick > this._LastTimeTick) {
      this._LastTimeTick = currentTimeTick;
      this._CurrentSeqNumber = this.MinSeqNumber;
      this._IsOverCost = false;
      this._OverCostCountInOneTerm = 0n;
      return this.calcId(this._LastTimeTick);
    }

    if (this._OverCostCountInOneTerm >= this.TopOverCostCount) {
      this._LastTimeTick = this.getNextTimeTick();
      this._CurrentSeqNumber = this.MinSeqNumber;
      this._IsOverCost = false;
      this._OverCostCountInOneTerm = 0n;
      return this.calcId(this._LastTimeTick);
    }

    if (this._CurrentSeqNumber > this.MaxSeqNumber) {
      this._LastTimeTick++;
      this._CurrentSeqNumber = this.MinSeqNumber;
      this._IsOverCost = true;
      this._OverCostCountInOneTerm++;
      return this.calcId(this._LastTimeTick);
    }

    return this.calcId(this._LastTimeTick);
  }

  private nextNormalId() {
    const currentTimeTick = this.getCurrentTimeTick();

    if (currentTimeTick < this._LastTimeTick) {
      if (this._TurnBackTimeTick < 1n) {
        this._TurnBackTimeTick = this._LastTimeTick - 1n;
        this._TurnBackIndex++;
        if (this._TurnBackIndex > 4n) this._TurnBackIndex = 1n;
      }
      return this.calcTurnBackId(this._TurnBackTimeTick);
    }

    if (this._TurnBackTimeTick > 0n) {
      this._TurnBackTimeTick = 0n;
    }

    if (currentTimeTick > this._LastTimeTick) {
      this._LastTimeTick = currentTimeTick;
      this._CurrentSeqNumber = this.MinSeqNumber;
      return this.calcId(this._LastTimeTick);
    }

    if (this._CurrentSeqNumber > this.MaxSeqNumber) {
      this._LastTimeTick++;
      this._CurrentSeqNumber = this.MinSeqNumber;
      this._IsOverCost = true;
      this._OverCostCountInOneTerm = 1n;
      return this.calcId(this._LastTimeTick);
    }

    return this.calcId(this._LastTimeTick);
  }

  nextBigInt() {
    return this._IsOverCost ? this.nextOverCostId() : this.nextNormalId();
  }

  nextString() {
    return this.nextBigInt().toString();
  }
}

