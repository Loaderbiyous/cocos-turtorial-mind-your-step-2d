import { _decorator, Component, EventMouse, input, Input, Vec3, Animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property(Animation)
    private BodyAnim: Animation = null; // 动画

    private _curMoveIndex: number = 0; // 当前跳跃的总步数
    private _startJump: boolean = false; // 玩家是否处于移动状态
    private _jumpStep: number = 0; //  接收鼠标事件之后单次移动的总距离
    private _curJumpTime: number = 0; // 当前移动的总时间
    private _jumpTime: number = 0.3; // 单次移动的总时间
    private _JumpSpeed: number = 0; // 单次移动的平均速度
    private _curPos: Vec3 = new Vec3(); // 玩家当前所在位置
    private _deltaPos: Vec3 = new Vec3(0, 0, 0); // 单次位移的变化向量
    private _targetPos: Vec3 = new Vec3(); // 目标位置

    start() {
        // input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    // 设置监听器状态
    setInputActive(active: boolean) {
        if (active) {
            input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        } else {
            input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        }
    }

    update(deltaTime: number) {
        if (this._startJump) {
            this._curJumpTime += deltaTime; // 累计总的跳跃时间
            if (this._curJumpTime > this._jumpTime) { // 当跳跃时间是否结束
                // 该次跳跃已经结束
                this.node.setPosition(this._targetPos); // 强制位置到目标位置，尽管按上一步的速度到达的位置已经超过了目标位置
                this._startJump = false; // 重置跳跃标记
                this.onOnceJumpEnd(); // 跳跃结束
            } else {
                // 该次跳跃还未结束
                this.node.getPosition(this._curPos);
                this._deltaPos.x = this._JumpSpeed * deltaTime; // 每一帧根据速度和时间计算位移
                Vec3.add(this._curPos, this._curPos, this._deltaPos); // 应用这个位移
                this.node.setPosition(this._curPos); // 将位移设置给角色
            }
        }
    }

    // 鼠标释放时
    onMouseUp(event: EventMouse) {
        if (event.getButton() === 0) {
            // 鼠标左键释放时
            this.jumpByStep(40);
        } else if (event.getButton() === 1) {
            // 鼠标中键释放时
            this.jumpByStep(80)
        } else if (event.getButton() === 2) {
            // 鼠标右键释放时
            this.jumpByStep(120);
        }
    }

    // 跳跃一次
    jumpByStep(step: number) {
        // 上一步跳跃还未完成
        if (this._startJump) {
            return;
        }
        // 上一步跳跃已完成，开始新的跳跃
        this._curMoveIndex += step / 40; // 改变步数值
        this._startJump = true;  // 标记开始跳跃
        this._jumpStep = step; // 跳跃的步数
        this._curJumpTime = 0; // 重置开始跳跃的总时间

        // 获取当前跳跃的动画名，然后使单次移动的时间和动画的时间相等，使玩家的跳跃动作更协调
        // 注意：state包含了该动画的状态信息，这些信息可以在动画还没有被实际播放之前就获取到！比如动画总时间
        let clipName = 'jump';
        const state = this.BodyAnim.getState(clipName);
        this._jumpTime = state.duration;

        this._JumpSpeed = this._jumpStep / this._jumpTime; // 根据时间计算出平均速度
        this.node.getPosition(this._curPos); // 获取角色当前的位置赋值给curPos
        Vec3.add(this._targetPos, this._curPos, new Vec3(this._jumpStep, 0, 0));    // 计算出目标位置

        // 播放动画
        if (this.BodyAnim) {
            this.BodyAnim.play('jump');
        }
    }

    // 重置属性
    reset() {
        this._curMoveIndex = 0;
    }

    // 跳跃结束时调用
    onOnceJumpEnd() {
        this.node.emit('JumpEnd', this._curMoveIndex);
    }

}

